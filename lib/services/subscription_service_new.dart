import 'dart:async';
import 'dart:io' show Platform;

import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:apppay/utils/debug_helper.dart';
import 'package:apppay/services/purchase_handlers.dart';
import 'package:apppay/services/restore_purchase_manager.dart';
import 'package:apppay/services/product_manager.dart';
import 'package:apppay/services/purchase_processor.dart';
import 'package:flutter/services.dart';

/// 订阅服务 - 主要的应用内购买服务类
///
/// 职责：
/// - 初始化应用内购买服务
/// - 管理购买流程
/// - 协调各个子模块
class SubscriptionService {
  // 核心服务
  StreamSubscription<List<PurchaseDetails>>? _subscription;
  final InAppPurchase _inAppPurchase = InAppPurchase.instance;

  // 子模块
  late final ProductManager _productManager;
  late final RestorePurchaseManager _restoreManager;
  late final PurchaseStatusHandler _statusHandler;
  late final PurchaseProcessor _purchaseProcessor;

  // 回调函数
  Function(String)? onPurchaseSuccess;
  Function(String)? onPurchaseError;
  Function()? onPurchasePending;
  Function()? onPurchaseCanceled;
  Function(String)? onProductAlreadyOwned;

  // 用户ID（在实际应用中应该从用户认证系统获取）
  String userId = 'test-user-001'; // TODO: 替换为实际的用户ID

  /// 初始化服务
  Future<void> init() async {
    print('🚀 初始化订阅服务');

    // 初始化子模块
    _initializeModules();

    // 检查是否支持应用内购买
    if (!await _checkInAppPurchaseAvailability()) {
      return;
    }

    // 设置购买流监听
    _setupPurchaseStreamListener();

    // 预加载产品信息
    await _preloadProducts();

    // 运行调试检查（仅在Debug模式）
    await _runDebugChecksIfNeeded();

    print('✅ 订阅服务初始化完成');
  }

  /// 初始化子模块
  void _initializeModules() {
    _productManager = ProductManager();
    _restoreManager = RestorePurchaseManager();
    _statusHandler = PurchaseStatusHandler(
      userId: userId,
      onSuccess: onPurchaseSuccess,
      onError: onPurchaseError,
      onPending: onPurchasePending,
      onCanceled: onPurchaseCanceled,
      onAlreadyOwned: onProductAlreadyOwned,
    );
    _purchaseProcessor = PurchaseProcessor(
      statusHandler: _statusHandler,
      restoreManager: _restoreManager,
      productManager: _productManager,
      onSummaryReady: onProductAlreadyOwned,
    );
  }

  /// 检查应用内购买可用性
  Future<bool> _checkInAppPurchaseAvailability() async {
    final bool available = await _inAppPurchase.isAvailable();
    if (!available) {
      print('❌ 应用内购买不可用');
      onPurchaseError?.call('应用内购买不可用');
      return false;
    }
    print('✅ 应用内购买可用');
    return true;
  }

  /// 设置购买流监听器
  void _setupPurchaseStreamListener() {
    _subscription = _inAppPurchase.purchaseStream.listen(
      _purchaseProcessor.processPurchaseUpdates,
      onDone: () => _subscription?.cancel(),
      onError: _handlePurchaseStreamError,
    );
    print('👂 购买流监听器已设置');
  }

  /// 处理购买流错误
  void _handlePurchaseStreamError(Object error) {
    print('❌ 购买流错误: $error');
    if (_isPurchaseCancelledError(error)) {
      onPurchaseCanceled?.call();
    } else {
      onPurchaseError?.call('购买过程中发生错误: $error');
    }
  }

  /// 预加载产品信息
  Future<void> _preloadProducts() async {
    try {
      await _productManager.queryProducts();
      print('📦 产品信息预加载完成');
    } catch (e) {
      print('⚠️ 产品信息预加载失败: $e');
      onPurchaseError?.call('产品信息加载失败: $e');
    }
  }

  /// 运行调试检查（仅在Debug模式）
  Future<void> _runDebugChecksIfNeeded() async {
    if (const bool.fromEnvironment('dart.vm.product') == false) {
      await DebugHelper.debugInAppPurchaseSetup();
    }
  }

  /// 检查是否是用户取消购买的异常
  bool _isPurchaseCancelledError(Object error) {
    if (error is PlatformException) {
      return error.code == 'storekit_purchase_cancelled' ||
          error.code == 'storekit2_purchase_cancelled';
    }
    return false;
  }

  /// 检查产品是否已购买
  bool isProductPurchased(String productId) {
    return _productManager.isProductPurchased(productId);
  }

  /// 购买产品
  Future<void> purchaseProduct(String productId) async {
    print('🛒 尝试购买产品: $productId');

    // 检查产品是否已购买
    if (isProductPurchased(productId)) {
      print('⚠️ 产品已购买，阻止重复购买: $productId');
      onProductAlreadyOwned?.call('您已经拥有此产品');
      return;
    }

    try {
      // 查询产品信息
      final product = await _queryProductWithTimeout(productId);
      if (product == null) return;

      // 执行购买
      await _executePurchase(product);
    } catch (e) {
      _handlePurchaseException(e);
    }
  }

  /// 查询产品信息（带超时）
  Future<ProductDetails?> _queryProductWithTimeout(String productId) async {
    try {
      final product = await _productManager
          .queryProduct(productId)
          .timeout(const Duration(seconds: 10));

      if (product == null) {
        onPurchaseError?.call('未找到产品: $productId\n请检查产品ID是否正确配置');
        return null;
      }

      print('📦 找到产品: ${product.title}, 价格: ${product.price}');
      return product;
    } on TimeoutException {
      onPurchaseError?.call('查询产品信息超时，请检查网络连接');
      return null;
    }
  }

  /// 执行购买
  Future<void> _executePurchase(ProductDetails product) async {
    print('💳 开始购买流程: ${product.title}');

    final purchaseParam = PurchaseParam(
      productDetails: product,
      applicationUserName: null,
    );

    final bool success = await _inAppPurchase
        .buyNonConsumable(purchaseParam: purchaseParam)
        .timeout(const Duration(seconds: 30));

    if (!success) {
      onPurchaseError?.call('无法启动购买流程，请稍后重试');
    }
  }

  /// 处理购买异常
  void _handlePurchaseException(Object e) {
    print('❌ 购买过程中发生异常: $e');

    if (_isPurchaseCancelledError(e)) {
      onPurchaseCanceled?.call();
      return;
    }

    String errorMessage = '购买过程中发生错误: $e';

    if (e.toString().contains('超时')) {
      errorMessage = '购买请求超时，请检查网络连接后重试';
    } else if (e.toString().contains('未找到产品')) {
      errorMessage = '产品配置错误，请联系开发者';
    }

    onPurchaseError?.call(errorMessage);
  }

  /// 恢复购买（仅iOS）
  Future<void> restorePurchases() async {
    if (Platform.isIOS) {
      print('🔄 开始恢复购买');
      await _inAppPurchase.restorePurchases();
    }
  }

  /// 释放资源
  void dispose() {
    print('🗑️ 释放订阅服务资源');
    _subscription?.cancel();
  }
}
