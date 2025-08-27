import 'package:apppay/constants/product_ids.dart';

class SubscriptionProduct {
  final String id;
  final String title;
  final String description;
  final String price;
  final String period;
  final bool isPopular;

  SubscriptionProduct({
    required this.id,
    required this.title,
    required this.description,
    required this.price,
    required this.period,
    required this.isPopular,
  });

  // 示例数据
  static List<SubscriptionProduct> getSampleProducts() {
    return [
      SubscriptionProduct(
        id: ProductIds.monthlySubscription,
        title: '月度会员',
        description: '解锁所有高级功能，享受无广告体验',
        price: '¥18.00',
        period: '每月',
        isPopular: false,
      ),
      SubscriptionProduct(
        id: ProductIds.yearlySubscription,
        title: '年度会员',
        description: '享受全年服务，节省超过50%',
        price: '¥128.00',
        period: '每年',
        isPopular: true,
      ),
      SubscriptionProduct(
        id: ProductIds.quarterlySubscription,
        title: '季度会员',
        description: '中等时长订阅，性价比高',
        price: '¥45.00',
        period: '每季度',
        isPopular: false,
      ),
    ];
  }
}