import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:apppay/services/purchase_handlers.dart';
import 'package:apppay/services/restore_purchase_manager.dart';
import 'package:apppay/services/product_manager.dart';
import 'package:apppay/utils/debug_helper.dart';

/// 购买处理器 - 负责处理购买更新和状态分发
class PurchaseProcessor {
  final PurchaseStatusHandler _statusHandler;
  final RestorePurchaseManager _restoreManager;
  final ProductManager _productManager;
  final Function(String)? _onSummaryReady;

  PurchaseProcessor({
    required PurchaseStatusHandler statusHandler,
    required RestorePurchaseManager restoreManager,
    required ProductManager productManager,
    Function(String)? onSummaryReady,
  })  : _statusHandler = statusHandler,
        _restoreManager = restoreManager,
        _productManager = productManager,
        _onSummaryReady = onSummaryReady;

  /// 处理购买更新列表
  Future<void> processPurchaseUpdates(List<PurchaseDetails> purchases) async {
    print('📋 收到购买更新，共 ${purchases.length} 个记录');

    // 检查是否包含恢复购买，如果是则重置状态
    if (_containsRestoredPurchases(purchases)) {
      _restoreManager.reset();
    }

    // 处理每个购买记录
    for (int i = 0; i < purchases.length; i++) {
      final purchase = purchases[i];
      await _processSinglePurchase(purchase);

      // 完成交易
      await _completePurchaseIfNeeded(purchase);

      // 如果是最后一个购买记录，显示摘要
      if (i == purchases.length - 1) {
        _showSummaryIfNeeded();
      }
    }

    _logCurrentState();
  }

  /// 处理单个购买记录
  Future<void> _processSinglePurchase(PurchaseDetails purchase) async {
    _logPurchaseDetails(purchase);
    DebugHelper.explainPurchaseStatus(purchase.status.toString());

    // 添加已购买产品到管理器
    if (_isPurchaseSuccessfulOrRestored(purchase)) {
      _productManager.addPurchasedProduct(purchase.productID);
    }

    // 根据状态分发处理
    switch (purchase.status) {
      case PurchaseStatus.purchased:
        _statusHandler.handlePurchaseSuccess(purchase);
        break;

      case PurchaseStatus.restored:
        await _handleRestoredPurchase(purchase);
        break;

      case PurchaseStatus.pending:
        _statusHandler.handlePendingPurchase(purchase);
        break;

      case PurchaseStatus.error:
        _statusHandler.handlePurchaseError(purchase);
        break;

      case PurchaseStatus.canceled:
        _statusHandler.handlePurchaseCanceled(purchase);
        break;
    }
  }

  /// 处理恢复购买
  Future<void> _handleRestoredPurchase(PurchaseDetails purchase) async {
    final productId = purchase.productID;

    // 统计恢复购买
    _restoreManager.addRestoredProduct(productId);

    // 检查是否需要通知后端（避免重复）
    if (!_restoreManager.isProductProcessed(productId)) {
      _restoreManager.markProductAsProcessed(productId);
      await _statusHandler.handleRestoredPurchase(purchase);
    } else {
      print('⏭️ 产品 $productId 已处理过，跳过后端通知');
    }
  }

  /// 完成交易（如果需要）
  Future<void> _completePurchaseIfNeeded(PurchaseDetails purchase) async {
    if (_shouldCompletePurchase(purchase)) {
      print('✅ 完成交易: ${purchase.productID}');
      await InAppPurchase.instance.completePurchase(purchase);
    }
  }

  /// 显示摘要（如果需要）
  void _showSummaryIfNeeded() {
    Future.delayed(const Duration(milliseconds: 500), () {
      final summary = _restoreManager.generateSummary();
      if (summary != null) {
        print('📋 $summary');
        _onSummaryReady?.call(summary);
      }
    });
  }

  /// 检查是否包含恢复购买
  bool _containsRestoredPurchases(List<PurchaseDetails> purchases) {
    return purchases.any((p) => p.status == PurchaseStatus.restored);
  }

  /// 检查是否是成功或恢复的购买
  bool _isPurchaseSuccessfulOrRestored(PurchaseDetails purchase) {
    return purchase.status == PurchaseStatus.purchased ||
        purchase.status == PurchaseStatus.restored;
  }

  /// 检查是否应该完成交易
  bool _shouldCompletePurchase(PurchaseDetails purchase) {
    return purchase.status == PurchaseStatus.purchased ||
        purchase.status == PurchaseStatus.restored ||
        purchase.status == PurchaseStatus.error ||
        purchase.status == PurchaseStatus.canceled;
  }

  /// 记录购买详情
  void _logPurchaseDetails(PurchaseDetails purchase) {
    print('📦 购买记录: 产品=${purchase.productID}, '
        '状态=${purchase.status}, 交易ID=${purchase.purchaseID}');
  }

  /// 记录当前状态
  void _logCurrentState() {
    final purchasedProducts = _productManager.purchasedProducts;
    final restoreStats = _restoreManager.getStats();

    print('📊 当前状态:');
    print('   已购买产品: $purchasedProducts');
    print('   恢复购买统计: $restoreStats');
  }
}
