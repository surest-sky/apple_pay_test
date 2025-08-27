import 'dart:async';
import 'dart:io' show Platform;

import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:apppay/constants/product_ids.dart';
import 'package:flutter/services.dart'; // 导入 PlatformException

class SubscriptionService {
  static const List<String> _productIds = <String>[
    ProductIds.monthlySubscription,
    ProductIds.yearlySubscription,
    ProductIds.quarterlySubscription,
  ];

  StreamSubscription<List<PurchaseDetails>>? _subscription;
  final InAppPurchase _inAppPurchase = InAppPurchase.instance;

  // 存储已购买的产品
  final Set<String> _purchasedProducts = <String>{};

  // 标记是否已完成初始化
  bool _isInitialized = false;

  Function(String)? onPurchaseSuccess;
  Function(String)? onPurchaseError;
  Function()? onPurchasePending;
  Function()? onPurchaseCanceled;
  Function(String)? onProductAlreadyOwned; // 添加已拥有产品回调

  // 初始化
  Future<void> init() async {
    // 检查是否支持应用内购买
    final bool available = await _inAppPurchase.isAvailable();
    if (!available) {
      onPurchaseError?.call('应用内购买不可用');
      return;
    }

    // 监听购买更新
    _subscription = _inAppPurchase.purchaseStream.listen(
      _handlePurchaseUpdates,
      onDone: () => _subscription?.cancel(),
      onError: (Object error) {
        print('购买流错误: $error');
        // 检查是否是用户取消购买的异常
        if (_isPurchaseCancelledError(error)) {
          onPurchaseCanceled?.call();
        } else {
          onPurchaseError?.call('购买过程中发生错误: $error');
        }
      },
    );

    // 获取产品信息
    await _getProducts();

    _isInitialized = true;
  }

  // 检查是否是用户取消购买的异常
  bool _isPurchaseCancelledError(Object error) {
    if (error is PlatformException) {
      // iOS平台用户取消购买的错误代码
      if (error.code == 'storekit_purchase_cancelled' ||
          error.code == 'storekit2_purchase_cancelled') {
        return true;
      }
    }
    return false;
  }

  // 获取产品信息
  Future<List<ProductDetails>> _getProducts() async {
    final ProductDetailsResponse response =
        await _inAppPurchase.queryProductDetails(_productIds.toSet());

    if (response.notFoundIDs.isNotEmpty) {
      onPurchaseError?.call('未找到以下产品: ${response.notFoundIDs}');
    }

    return response.productDetails;
  }

  // 处理购买更新
  void _handlePurchaseUpdates(List<PurchaseDetails> purchases) {
    print('收到购买更新，共 ${purchases.length} 个购买记录');

    for (int i = 0; i < purchases.length; i++) {
      final purchase = purchases[i];
      print('购买记录 $i: 产品ID = ${purchase.productID}, 状态 = ${purchase.status}, '
          '购买ID = ${purchase.purchaseID}, 交易ID = ');

      // 将已购买的产品添加到集合中（如果购买成功）
      if (purchase.status == PurchaseStatus.purchased) {
        print('发现已购买的产品: ${purchase.productID}');
        _purchasedProducts.add(purchase.productID);
      }

      if (purchase.status == PurchaseStatus.purchased) {
        // 购买成功
        print('购买成功: ${purchase.productID}');
        _handleSuccessfulPurchase(purchase);
      } else if (purchase.status == PurchaseStatus.pending) {
        // 购买待处理
        print('购买待处理: ${purchase.productID}');
        onPurchasePending?.call();
      } else if (purchase.status == PurchaseStatus.error) {
        // 购买错误
        print('购买错误: ${purchase.productID}, 错误信息 = ${purchase.error?.message}');
        // 检查是否是用户取消购买的错误
        if (_isPurchaseCancelledError(purchase.error!)) {
          onPurchaseCanceled?.call();
        } else {
          onPurchaseError?.call('购买失败: ${purchase.error?.message}');
        }
      } else if (purchase.status == PurchaseStatus.canceled) {
        // 用户取消购买
        print('用户取消购买: ${purchase.productID}');
        onPurchaseCanceled?.call();
      }

      if (purchase.status == PurchaseStatus.purchased ||
          purchase.status == PurchaseStatus.error ||
          purchase.status == PurchaseStatus.canceled) {
        // 完成交易
        print('完成交易: ${purchase.productID}');
        _inAppPurchase.completePurchase(purchase);
      }
    }

    print('当前已购买的产品: $_purchasedProducts');
  }

  // 处理成功购买
  void _handleSuccessfulPurchase(PurchaseDetails purchase) {
    // 验证收据（在生产环境中应该发送到服务器验证）
    // 这里简化处理，直接认为购买成功
    onPurchaseSuccess?.call('购买成功！产品ID: ${purchase.productID}');
  }

  // 检查产品是否已购买
  bool isProductPurchased(String productId) {
    print(
        '检查产品是否已购买: $productId, 结果: ${_purchasedProducts.contains(productId)}');
    return _purchasedProducts.contains(productId);
  }

  // 购买产品
  Future<void> purchaseProduct(String productId) async {
    print('尝试购买产品: $productId');

    // 检查产品是否已购买
    if (isProductPurchased(productId)) {
      print('产品已购买，阻止重复购买: $productId');
      onProductAlreadyOwned?.call('您已经拥有此产品');
      return;
    }

    final ProductDetailsResponse response =
        await _inAppPurchase.queryProductDetails({productId});

    if (response.productDetails.isEmpty) {
      onPurchaseError?.call('未找到产品: $productId');
      return;
    }

    final ProductDetails product = response.productDetails.first;

    final PurchaseParam purchaseParam = PurchaseParam(
      productDetails: product,
      applicationUserName: null,
    );

    try {
      // 对于订阅产品，使用buyNonConsumable（对于自动续订订阅，Flutter的in_app_purchase插件使用buyNonConsumable）
      await _inAppPurchase.buyNonConsumable(purchaseParam: purchaseParam);
    } catch (e) {
      // 捕获购买过程中可能发生的异常
      if (_isPurchaseCancelledError(e)) {
        onPurchaseCanceled?.call();
      } else {
        // 对于其他异常，我们也需要通知页面
        onPurchaseError?.call('购买过程中发生错误: $e');
      }
    }
  }

  // 恢复购买（仅iOS）
  Future<void> restorePurchases() async {
    if (Platform.isIOS) {
      await _inAppPurchase.restorePurchases();
    }
  }

  // 释放资源
  void dispose() {
    _subscription?.cancel();
  }
}
