import 'package:in_app_purchase/in_app_purchase.dart';
import 'package:apppay/constants/product_ids.dart';

/// 产品管理器 - 负责产品查询和购买状态管理
class ProductManager {
  final InAppPurchase _inAppPurchase = InAppPurchase.instance;
  final Set<String> _purchasedProducts = <String>{};

  static const List<String> _productIds = <String>[
    ProductIds.monthlySubscription,
    ProductIds.yearlySubscription,
    ProductIds.quarterlySubscription,
  ];

  /// 获取产品列表
  static List<String> get productIds => _productIds;

  /// 查询产品详情
  Future<List<ProductDetails>> queryProducts() async {
    final ProductDetailsResponse response =
        await _inAppPurchase.queryProductDetails(_productIds.toSet());

    if (response.notFoundIDs.isNotEmpty) {
      throw Exception('未找到以下产品: ${response.notFoundIDs}');
    }

    return response.productDetails;
  }

  /// 查询单个产品
  Future<ProductDetails?> queryProduct(String productId) async {
    final ProductDetailsResponse response =
        await _inAppPurchase.queryProductDetails({productId});

    if (response.productDetails.isEmpty) {
      return null;
    }

    return response.productDetails.first;
  }

  /// 添加已购买的产品
  void addPurchasedProduct(String productId) {
    _purchasedProducts.add(productId);
    print('📦 添加已购买产品: $productId');
  }

  /// 检查产品是否已购买
  bool isProductPurchased(String productId) {
    final result = _purchasedProducts.contains(productId);
    print('🔍 检查产品购买状态: $productId = $result');
    return result;
  }

  /// 获取所有已购买的产品
  Set<String> get purchasedProducts => Set.from(_purchasedProducts);

  /// 清空已购买产品列表
  void clearPurchasedProducts() {
    _purchasedProducts.clear();
    print('🗑️ 清空已购买产品列表');
  }
}
