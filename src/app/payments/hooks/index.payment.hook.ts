import { useRouter } from 'next/navigation';
import * as PortOne from "@portone/browser-sdk/v2";

/**
 * 포트원 V2 빌링키 발급 및 구독 결제 훅
 */
export function usePaymentSubscription() {
  const router = useRouter();

  /**
   * 구독하기 버튼 클릭 핸들러
   * 1. 빌링키 발급 (포트원 결제창)
   * 2. 결제 API 요청
   * 3. 성공 시 알림 및 페이지 이동
   */
  const handleSubscribe = async () => {
    try {
      // STEP 1: 빌링키 발급 - 포트원 결제창 호출
      const issueResponse = await PortOne.requestIssueBillingKey({
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID!,
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY!,
        billingKeyMethod: "CARD",
        customer: {
          customerId: `customer_${Date.now()}`, // 실제로는 로그인한 사용자 ID 사용
        },
      });

      // 빌링키 발급 응답이 없거나 실패 시 에러 처리
      if (!issueResponse || issueResponse.code !== undefined) {
        alert(`빌링키 발급 실패: ${issueResponse?.message || '알 수 없는 오류'}`);
        return;
      }

      // 빌링키 발급 성공
      const billingKey = issueResponse.billingKey;
      console.log('빌링키 발급 성공:', billingKey);

      // STEP 2: 결제 API 요청
      const paymentResponse = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          billingKey,
          orderName: 'IT 매거진 월간 구독',
          amount: 9900,
          customer: {
            id: `customer_${Date.now()}`, // 실제로는 로그인한 사용자 ID 사용
          },
        }),
      });

      const paymentResult = await paymentResponse.json();

      // STEP 3: 결제 결과 처리
      if (paymentResult.success) {
        // 성공 알림
        alert('구독에 성공하였습니다.');
        
        // /magazines 페이지로 이동
        router.push('/magazines');
      } else {
        // 실패 알림
        alert(`결제 실패: ${paymentResult.error || '알 수 없는 오류가 발생했습니다.'}`);
      }
    } catch (error) {
      console.error('구독 처리 중 오류:', error);
      alert('구독 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  return {
    handleSubscribe,
  };
}
