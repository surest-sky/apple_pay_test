/// 恢复购买管理器 - 负责管理恢复购买的统计和去重
class RestorePurchaseManager {
  final Set<String> _processedProducts = <String>{};
  final List<String> _restoredProducts = [];
  int _restoredPurchaseCount = 0;

  /// 重置状态
  void reset() {
    _processedProducts.clear();
    _restoredProducts.clear();
    _restoredPurchaseCount = 0;
    print('🔄 重置恢复购买状态');
  }

  /// 检查产品是否已处理过
  bool isProductProcessed(String productId) {
    return _processedProducts.contains(productId);
  }

  /// 标记产品为已处理
  void markProductAsProcessed(String productId) {
    _processedProducts.add(productId);
  }

  /// 添加恢复的产品到统计
  void addRestoredProduct(String productId) {
    _restoredPurchaseCount++;
    if (!_restoredProducts.contains(productId)) {
      _restoredProducts.add(productId);
    }
  }

  /// 生成恢复购买摘要
  String? generateSummary() {
    if (_restoredPurchaseCount == 0) return null;

    final uniqueProducts = _restoredProducts.length;
    final productList = _restoredProducts.join(', ');

    if (uniqueProducts == 1) {
      return '✅ 恢复购买完成！\n已恢复产品: $productList';
    } else {
      return '✅ 恢复购买完成！\n共恢复了 $uniqueProducts 种产品\n产品: $productList';
    }
  }

  /// 获取统计信息
  Map<String, dynamic> getStats() {
    return {
      'totalTransactions': _restoredPurchaseCount,
      'uniqueProducts': _restoredProducts.length,
      'products': List.from(_restoredProducts),
    };
  }
}
