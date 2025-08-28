import 'package:flutter/material.dart';
// 导入 PlatformException
import 'package:apppay/models/subscription_product.dart';
import 'package:apppay/services/subscription_service.dart';
import 'package:apppay/services/api_service.dart';
import 'package:apppay/utils/debug_helper.dart';

class SubscriptionPage extends StatefulWidget {
  const SubscriptionPage({super.key});

  @override
  State<SubscriptionPage> createState() => _SubscriptionPageState();
}

class _SubscriptionPageState extends State<SubscriptionPage> {
  late SubscriptionService _subscriptionService;
  List<SubscriptionProduct> _products = [];
  bool _isLoading = true;
  String _message = '';

  @override
  void initState() {
    super.initState();
    _initSubscriptionService();
    _loadProducts();
  }

  Future<void> _initSubscriptionService() async {
    _subscriptionService = SubscriptionService();
    _subscriptionService.onPurchaseSuccess = (String message) {
      setState(() {
        _message = message;
        _isLoading = false; // 确保加载状态被重置
      });
      // 显示成功对话框
      _showSuccessDialog(message);
    };

    _subscriptionService.onPurchaseError = (String error) {
      setState(() {
        _message = error;
        _isLoading = false;
      });
      // 显示错误对话框
      _showErrorDialog(error);
    };

    _subscriptionService.onPurchasePending = () {
      setState(() {
        _message = '购买处理中...';
        // 不要设置 _isLoading = false，保持加载状态
      });
    };

    _subscriptionService.onPurchaseCanceled = () {
      setState(() {
        _isLoading = false;
        _message = '购买已取消';
      });
      // 显示取消对话框
      _showCancelDialog();
    };

    _subscriptionService.onProductAlreadyOwned = (String message) {
      setState(() {
        _isLoading = false;
        _message = message;
      });
      // 显示已拥有产品对话框
      _showInfoDialog('产品已拥有', message);
    };

    try {
      await _subscriptionService.init();

      // 在Debug模式下运行诊断
      if (const bool.fromEnvironment('dart.vm.product') == false) {
        await DebugHelper.debugInAppPurchaseSetup();
      }
    } catch (e) {
      print('初始化订阅服务时发生错误: $e');
      setState(() {
        _message = '初始化失败: $e';
        _isLoading = false;
      });
    }
  }

  Future<void> _loadProducts() async {
    setState(() {
      _isLoading = true;
    });

    // 使用示例产品数据
    await Future.delayed(const Duration(milliseconds: 500));

    setState(() {
      _products = SubscriptionProduct.getSampleProducts();
      _isLoading = false;
    });
  }

  Future<void> _purchaseProduct(SubscriptionProduct product) async {
    // 记录购买尝试
    DebugHelper.logPurchaseAttempt(product.id);

    setState(() {
      _isLoading = true;
      _message = '正在处理购买...';
    });

    try {
      // 添加总体超时处理
      await _subscriptionService.purchaseProduct(product.id).timeout(
        const Duration(seconds: 60), // 总超时时间60秒
        onTimeout: () {
          DebugHelper.logPurchaseResult(product.id, '超时', '购买请求超时');
          setState(() {
            _isLoading = false;
            _message = '购买超时';
          });
          _showErrorDialog(
              '购买请求超时，请检查网络连接后重试\n\n可能的原因：\n1. 网络连接问题\n2. App Store服务器响应慢\n3. 产品ID配置错误');
          throw Exception('购买超时');
        },
      );
    } catch (e) {
      // 处理购买过程中可能发生的异常
      print('UI层捕获到异常: $e');
      DebugHelper.logPurchaseResult(product.id, '错误', e.toString());

      if (!e.toString().contains('购买超时')) {
        setState(() {
          _isLoading = false;
          _message = '购买过程中发生错误';
        });

        String errorMessage = '购买过程中发生错误: $e';
        if (e.toString().contains('未找到产品')) {
          errorMessage +=
              '\n\n这通常表示：\n1. 产品ID配置错误\n2. App Store Connect中产品未正确设置\n3. Bundle ID不匹配';
        }

        _showErrorDialog(errorMessage);
      }
    }
  }

  Future<void> _restorePurchases() async {
    setState(() {
      _isLoading = true;
      _message = '正在恢复购买...';
    });

    await _subscriptionService.restorePurchases();

    setState(() {
      _isLoading = false;
      _message = '恢复购买请求已发送';
    });

    // 显示成功对话框
    _showSuccessDialog('恢复购买请求已发送，请检查您的购买记录');
  }

  Future<void> _runDebugCheck() async {
    setState(() {
      _isLoading = true;
      _message = '正在运行调试检查...';
    });

    try {
      await DebugHelper.debugInAppPurchaseSetup();
      setState(() {
        _isLoading = false;
        _message = '调试检查完成，请查看控制台日志';
      });
      _showInfoDialog('调试检查',
          '调试检查已完成，详细信息请查看控制台日志。\n\n如果发现产品ID未找到，请检查App Store Connect配置。');
    } catch (e) {
      setState(() {
        _isLoading = false;
        _message = '调试检查失败: $e';
      });
      _showErrorDialog('调试检查失败: $e');
    }
  }

  Future<void> _checkBackendStatus() async {
    setState(() {
      _isLoading = true;
      _message = '正在检查后端订阅状态...';
    });

    try {
      final result =
          await ApiService.getUserSubscriptionStatus('test-user-001');

      setState(() {
        _isLoading = false;
      });

      if (result['success'] == true) {
        final data = result['data']['data'];
        final userInfo = data['user'];
        final subscriptionInfo = data['subscription'];

        String statusMessage = '后端订阅状态:\n';
        statusMessage += '用户ID: ${userInfo['userId']}\n';
        statusMessage += '订阅状态: ${userInfo['subscriptionStatus']}\n';
        statusMessage += '订阅类型: ${userInfo['subscriptionType'] ?? '无'}\n';
        statusMessage += '过期时间: ${userInfo['subscriptionExpiryDate'] ?? '无'}\n';
        statusMessage += '最后验证: ${userInfo['lastVerifiedAt'] ?? '无'}\n';

        if (subscriptionInfo != null) {
          statusMessage += '\n订阅详情:\n';
          statusMessage += '产品ID: ${subscriptionInfo['productId']}\n';
          statusMessage += '状态: ${subscriptionInfo['status']}\n';
          statusMessage += '购买时间: ${subscriptionInfo['purchaseDate']}\n';
          statusMessage += '过期时间: ${subscriptionInfo['expiryDate']}\n';
        }

        setState(() {
          _message = '后端状态检查完成';
        });

        _showInfoDialog('后端订阅状态', statusMessage);
      } else {
        setState(() {
          _message = '后端状态检查失败';
        });
        _showErrorDialog('检查后端状态失败: ${result['error']}');
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _message = '检查后端状态时发生错误';
      });
      _showErrorDialog('检查后端状态失败: $e');
    }
  }

  void _showCancelDialog() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('购买取消'),
          content: const Text('您已取消购买'),
          actions: <Widget>[
            TextButton(
              child: const Text('确定'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
          ],
        );
      },
    );
  }

  void _showInfoDialog(String title, String message) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: Text(title),
          content: Text(message),
          actions: <Widget>[
            TextButton(
              child: const Text('确定'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
          ],
        );
      },
    );
  }

  void _showSuccessDialog(String message) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('购买成功'),
          content: Text(message),
          actions: <Widget>[
            TextButton(
              child: const Text('确定'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
          ],
        );
      },
    );
  }

  void _showErrorDialog(String error) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('购买失败'),
          content: Text(error),
          actions: <Widget>[
            TextButton(
              child: const Text('确定'),
              onPressed: () {
                Navigator.of(context).pop();
              },
            ),
          ],
        );
      },
    );
  }

  @override
  void dispose() {
    _subscriptionService.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('订阅产品'),
        centerTitle: true,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '选择订阅计划',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              '解锁所有高级功能，享受无广告体验',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 24),
            if (_isLoading)
              const Center(child: CircularProgressIndicator())
            else if (_products.isEmpty)
              const Center(
                child: Text(
                  '暂无可用的订阅产品',
                  style: TextStyle(fontSize: 16),
                ),
              )
            else
              Expanded(
                child: ListView.builder(
                  itemCount: _products.length,
                  itemBuilder: (context, index) {
                    final product = _products[index];
                    final isPurchased =
                        _subscriptionService.isProductPurchased(product.id);
                    return _SubscriptionProductCard(
                      product: product,
                      isPopular: product.isPopular,
                      isPurchased: isPurchased,
                      onTap: () => _purchaseProduct(product),
                    );
                  },
                ),
              ),
            const SizedBox(height: 24),
            if (!_isLoading)
              Column(
                children: [
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _restorePurchases,
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: const Text(
                        '恢复购买',
                        style: TextStyle(fontSize: 16),
                      ),
                    ),
                  ),
                  const SizedBox(height: 8),
                  // Debug模式下显示调试按钮
                  if (const bool.fromEnvironment('dart.vm.product') == false)
                    Column(
                      children: [
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: _runDebugCheck,
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text(
                              '🔍 调试检查',
                              style: TextStyle(fontSize: 14),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          width: double.infinity,
                          child: OutlinedButton(
                            onPressed: _checkBackendStatus,
                            style: OutlinedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: const Text(
                              '🖥️ 检查后端状态',
                              style: TextStyle(fontSize: 14),
                            ),
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            const SizedBox(height: 16),
            if (_message.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8.0),
                child: Text(
                  _message,
                  style: const TextStyle(
                    color: Colors.blue,
                    fontSize: 14,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _SubscriptionProductCard extends StatelessWidget {
  final SubscriptionProduct product;
  final bool isPopular;
  final bool isPurchased;
  final VoidCallback onTap;

  const _SubscriptionProductCard({
    required this.product,
    required this.isPopular,
    required this.isPurchased,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: isPopular
            ? const BorderSide(color: Colors.orange, width: 2)
            : BorderSide.none,
      ),
      elevation: 4,
      child: InkWell(
        onTap: isPurchased ? null : onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    product.title,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  if (isPopular)
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.orange,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        '推荐',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                product.description,
                style: const TextStyle(
                  fontSize: 14,
                  color: Colors.grey,
                ),
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    product.price,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.deepPurple,
                    ),
                  ),
                  Text(
                    product.period,
                    style: const TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                    ),
                  ),
                  ElevatedButton(
                    onPressed: isPurchased ? null : onTap,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: isPurchased
                          ? Colors.grey
                          : (isPopular
                              ? Colors.orange
                              : Theme.of(context).colorScheme.primary),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 20,
                        vertical: 12,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: Text(
                      isPurchased ? '已订阅' : '订阅',
                      style: TextStyle(
                        color: isPurchased ? Colors.white70 : Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
