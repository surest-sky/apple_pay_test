import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:apppay/services/api_service.dart';
import 'package:flutter/services.dart';

/// 购买状态处理器 - 负责处理不同的购买状态
class PurchaseStatusHandler {
  final String userId;
  final Function(String)? onSuccess;
  final Function(String)? onError;
  final Function()? onPending;
  final Function()? onCanceled;
  final Function(String)? onAlreadyOwned;

  PurchaseStatusHandler({
    required this.userId,
    this.onSuccess,
    this.onError,
    this.onPending,
    this.onCanceled,
    this.onAlreadyOwned,
  });

  /// 处理购买成功
  void handlePurchaseSuccess(PurchaseDetails purchase) {
    print('✅ 购买成功: ${purchase.productID}');
    onSuccess?.call('购买成功！产品ID: ${purchase.productID}');
  }

  /// 处理恢复购买
  Future<void> handleRestoredPurchase(PurchaseDetails purchase) async {
    print('🔄 恢复购买: ${purchase.productID}');

    // 通知后端
    await _notifyBackendRestoredPurchase(purchase);
  }

  /// 处理购买待处理
  void handlePendingPurchase(PurchaseDetails purchase) {
    print('⏳ 购买待处理: ${purchase.productID}');
    onPending?.call();
  }

  /// 处理购买错误
  void handlePurchaseError(PurchaseDetails purchase) {
    print('❌ 购买错误: ${purchase.productID}');
    final error = purchase.error;

    if (_isPurchaseCancelledError(error)) {
      onCanceled?.call();
    } else {
      onError?.call('购买失败: ${error?.message}');
    }
  }

  /// 处理购买取消
  void handlePurchaseCanceled(PurchaseDetails purchase) {
    print('🚫 购买取消: ${purchase.productID}');
    onCanceled?.call();
  }

  /// 通知后端恢复购买
  Future<void> _notifyBackendRestoredPurchase(PurchaseDetails purchase) async {
    print('🔄 通知后端: ${purchase.productID}');

    try {
      final result = await ApiService.retryApiCall(
        () => ApiService.notifyRestoredPurchase(
          userId: userId,
          productId: purchase.productID,
          originalTransactionId: purchase.purchaseID ?? 'unknown',
          purchaseId: purchase.purchaseID,
          environment: 'Sandbox',
        ),
        maxRetries: 2,
        retryDelay: const Duration(seconds: 1),
      );

      if (result['success'] == true) {
        print('   ✅ 成功');
      } else {
        print('   ❌ 失败: ${result['error']}');
      }
    } catch (e) {
      print('   ❌ 异常: $e');
    }
  }

  /// 检查是否是用户取消购买的异常
  bool _isPurchaseCancelledError(Object? error) {
    if (error is PlatformException) {
      return error.code == 'storekit_purchase_cancelled' ||
          error.code == 'storekit2_purchase_cancelled';
    }
    return false;
  }
}
