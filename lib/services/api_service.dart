import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiService {
  // 根据你的实际后端地址修改这个URL
  static const String baseUrl = 'http://192.168.1.2:3000/api';

  // 超时时间
  static const Duration timeout = Duration(seconds: 30);

  // 通知后端已恢复购买
  static Future<Map<String, dynamic>> notifyRestoredPurchase({
    required String userId,
    required String productId,
    required String originalTransactionId,
    String? purchaseId,
    String? environment,
  }) async {
    try {
      // print(
      //     '通知后端恢复购买: 用户=$userId, 产品=$productId, 原始交易ID=$originalTransactionId');

      final response = await http
          .post(
            Uri.parse('$baseUrl/subscriptions/handle-restored-purchase'),
            headers: {
              'Content-Type': 'application/json',
            },
            body: jsonEncode({
              'userId': userId,
              'productId': productId,
              'originalTransactionId': originalTransactionId,
              'purchaseId': purchaseId,
              'environment': environment ?? 'Sandbox',
            }),
          )
          .timeout(timeout);

      // 只在出错时打印详细响应
      if (response.statusCode != 200) {
        print('后端响应状态: ${response.statusCode}');
        print('后端响应内容: ${response.body}');
      }

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return {
          'success': true,
          'data': data,
        };
      } else {
        final Map<String, dynamic> errorData = jsonDecode(response.body);
        return {
          'success': false,
          'error': errorData['error'] ?? '后端处理失败',
          'statusCode': response.statusCode,
        };
      }
    } on SocketException catch (e) {
      print('网络连接错误: $e');
      return {
        'success': false,
        'error': '网络连接失败，请检查网络设置',
        'type': 'network_error',
      };
    } on http.ClientException catch (e) {
      print('HTTP客户端错误: $e');
      return {
        'success': false,
        'error': '网络请求失败',
        'type': 'client_error',
      };
    } on FormatException catch (e) {
      print('JSON解析错误: $e');
      return {
        'success': false,
        'error': '服务器响应格式错误',
        'type': 'parse_error',
      };
    } catch (e) {
      print('通知后端恢复购买时发生未知错误: $e');
      return {
        'success': false,
        'error': '通知后端时发生未知错误: $e',
        'type': 'unknown_error',
      };
    }
  }

  // DEPRECATED: verifyRestoredPurchase has been removed as Apple deprecated verifyReceipt API
  // Use App Store Server API instead

  // 获取用户订阅状态
  static Future<Map<String, dynamic>> getUserSubscriptionStatus(
      String userId) async {
    try {
      print('获取用户订阅状态: 用户=$userId');

      final response = await http.get(
        Uri.parse('$baseUrl/subscriptions/status/$userId'),
        headers: {
          'Content-Type': 'application/json',
        },
      ).timeout(timeout);

      print('订阅状态响应状态: ${response.statusCode}');
      print('订阅状态响应内容: ${response.body}');

      if (response.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(response.body);
        return {
          'success': true,
          'data': data,
        };
      } else {
        final Map<String, dynamic> errorData = jsonDecode(response.body);
        return {
          'success': false,
          'error': errorData['error'] ?? '获取订阅状态失败',
          'statusCode': response.statusCode,
        };
      }
    } catch (e) {
      print('获取订阅状态时发生错误: $e');
      return {
        'success': false,
        'error': '获取订阅状态时发生错误: $e',
        'type': 'unknown_error',
      };
    }
  }

  // 重试机制
  static Future<Map<String, dynamic>> retryApiCall(
      Future<Map<String, dynamic>> Function() apiCall,
      {int maxRetries = 3,
      Duration retryDelay = const Duration(seconds: 2)}) async {
    for (int attempt = 1; attempt <= maxRetries; attempt++) {
      print('API调用尝试 $attempt/$maxRetries');

      final result = await apiCall();

      if (result['success'] == true) {
        return result;
      }

      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        print('第 $attempt 次尝试失败，${retryDelay.inSeconds} 秒后重试...');
        await Future.delayed(retryDelay);
      } else {
        print('所有重试都失败了，返回最后一次的错误结果');
        return result;
      }
    }

    // 这行代码理论上不会执行到
    return {
      'success': false,
      'error': '重试机制出现未知错误',
    };
  }
}
