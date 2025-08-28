import 'dart:io';
import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:apppay/constants/product_ids.dart';

class DebugHelper {
  static Future<void> debugInAppPurchaseSetup() async {
    print('=== 开始调试应用内购买设置 ===');

    // 1. 检查平台
    print('当前平台: ${Platform.operatingSystem}');

    // 2. 检查应用内购买是否可用
    final InAppPurchase inAppPurchase = InAppPurchase.instance;
    final bool available = await inAppPurchase.isAvailable();
    print('应用内购买是否可用: $available');

    if (!available) {
      print('❌ 应用内购买不可用！可能的原因：');
      print('   1. 设备不支持应用内购买');
      print('   2. 网络连接问题');
      print('   3. App Store配置问题');
      return;
    }

    // 3. 检查产品ID配置
    print('配置的产品ID列表:');
    for (String productId in ProductIds.allProducts) {
      print('   - $productId');
    }

    // 4. 查询产品详情
    try {
      print('正在查询产品详情...');
      final ProductDetailsResponse response = await inAppPurchase
          .queryProductDetails(ProductIds.allProducts.toSet())
          .timeout(const Duration(seconds: 10));

      print('查询结果:');
      print('   找到的产品数量: ${response.productDetails.length}');
      print('   未找到的产品ID: ${response.notFoundIDs}');

      if (response.productDetails.isNotEmpty) {
        print('   产品详情:');
        for (ProductDetails product in response.productDetails) {
          print('     - ID: ${product.id}');
          print('       标题: ${product.title}');
          print('       价格: ${product.price}');
          print('       描述: ${product.description}');
        }
      }

      if (response.notFoundIDs.isNotEmpty) {
        print('❌ 未找到以下产品ID，请检查App Store Connect配置:');
        for (String id in response.notFoundIDs) {
          print('   - $id');
        }
        print('');
        print('解决方案:');
        print('1. 确认产品ID在App Store Connect中正确配置');
        print('2. 确认产品状态为"准备提交"或"等待审核"');
        print('3. 确认Bundle ID匹配');
        print('4. 等待App Store服务器同步（可能需要几小时）');
      }
    } catch (e) {
      print('❌ 查询产品详情时发生错误: $e');
      if (e.toString().contains('timeout')) {
        print('可能的原因: 网络连接问题或App Store服务器响应慢');
      }
    }

    print('=== 调试完成 ===');
  }

  static void logPurchaseAttempt(String productId) {
    print('=== 购买尝试日志 ===');
    print('产品ID: $productId');
    print('时间: ${DateTime.now()}');
    print('平台: ${Platform.operatingSystem}');
  }

  static void logPurchaseResult(String productId, String result,
      [String? error]) {
    print('=== 购买结果日志 ===');
    print('产品ID: $productId');
    print('结果: $result');
    if (error != null) {
      print('错误信息: $error');
    }
    print('时间: ${DateTime.now()}');
  }

  static void explainPurchaseStatus(String status) {
    print('=== 购买状态说明 ===');
    switch (status) {
      case 'PurchaseStatus.purchased':
        print('状态: 购买成功 - 用户成功完成了新的购买');
        break;
      case 'PurchaseStatus.restored':
        print('状态: 恢复购买 - 用户之前已购买过此产品，现在恢复了购买');
        print('注意: 这通常表示用户已经拥有此产品，不应该重复收费');
        break;
      case 'PurchaseStatus.pending':
        print('状态: 待处理 - 购买正在处理中，等待最终结果');
        break;
      case 'PurchaseStatus.error':
        print('状态: 错误 - 购买过程中发生了错误');
        break;
      case 'PurchaseStatus.canceled':
        print('状态: 已取消 - 用户取消了购买');
        break;
      default:
        print('状态: 未知状态 - $status');
    }
    print('===================');
  }
}
