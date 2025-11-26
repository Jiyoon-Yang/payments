import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

declare global {
  interface Window {
    PortOne?: {
      requestIssueBillingKey: (params: {
        storeId: string;
        channelKey: string;
        billingKeyMethod: string;
      }) => Promise<{
        code?: string;
        message?: string;
        billingKey?: string;
      }>;
    };
  }
}

export const usePayment = () => {
  const router = useRouter();

  /**
   * 빌링키 발급 및 구독 결제 처리
   */
  const handleSubscribe = async () => {
    try {
      // 1. 로그인된 사용자 정보 가져오기
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("로그인이 필요합니다.");
        return;
      }

      // 2. 환경 변수 확인
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
      const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;

      if (!storeId || !channelKey) {
        alert("포트원 설정이 누락되었습니다. 환경 변수를 확인해주세요.");
        return;
      }

      // 3. PortOne SDK 확인 및 로드 대기
      const waitForSDK = (): Promise<void> => {
        return new Promise((resolve, reject) => {
          if (typeof window === "undefined") {
            reject(new Error("브라우저 환경이 아닙니다."));
            return;
          }

          // 이미 로드되어 있는 경우
          if (
            window.PortOne &&
            typeof window.PortOne.requestIssueBillingKey === "function"
          ) {
            console.log("포트원 SDK가 이미 로드되어 있습니다.");
            resolve();
            return;
          }

          // 최대 5초 대기 (100ms 간격으로 50회 확인)
          let attempts = 0;
          const maxAttempts = 50;
          const checkInterval = setInterval(() => {
            attempts++;
            if (
              window.PortOne &&
              typeof window.PortOne.requestIssueBillingKey === "function"
            ) {
              console.log("포트원 SDK가 로드되었습니다.");
              clearInterval(checkInterval);
              resolve();
            } else if (attempts >= maxAttempts) {
              console.error("포트원 SDK 로드 실패:", {
                PortOne: window.PortOne,
                type: typeof window.PortOne,
                keys: window.PortOne ? Object.keys(window.PortOne) : null,
              });
              clearInterval(checkInterval);
              reject(new Error("포트원 SDK 로드 타임아웃"));
            } else {
              console.log(
                `포트원 SDK 로드 대기 중... (${attempts}/${maxAttempts})`
              );
            }
          }, 100);
        });
      };

      try {
        await waitForSDK();
      } catch (error) {
        console.error("포트원 SDK 로드 실패:", error);
        alert("포트원 SDK가 로드되지 않았습니다. 페이지를 새로고침해주세요.");
        return;
      }

      // 4. SDK 최종 확인
      if (
        !window.PortOne ||
        typeof window.PortOne.requestIssueBillingKey !== "function"
      ) {
        alert(
          "포트원 SDK가 제대로 로드되지 않았습니다. 페이지를 새로고침해주세요."
        );
        return;
      }

      // 5. 빌링키 발급 요청
      const issueResponse = await window.PortOne.requestIssueBillingKey({
        storeId,
        channelKey,
        billingKeyMethod: "CARD",
      });

      // 6. 빌링키 발급 실패 처리
      if (issueResponse.code || !issueResponse.billingKey) {
        alert(
          `빌링키 발급에 실패했습니다: ${
            issueResponse.message || "알 수 없는 오류"
          }`
        );
        return;
      }

      // 7. 세션 토큰 가져오기
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // 8. 빌링키로 결제 API 요청
      const paymentApiResponse = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          billingKey: issueResponse.billingKey,
          orderName: "IT 매거진 월간 구독",
          amount: 9900,
          customer: {
            id: user.id,
          },
          customData: user.id, // 로그인된 user_id
        }),
      });

      const paymentResult = await paymentApiResponse.json();

      // 9. 결제 실패 처리
      if (!paymentResult.success) {
        alert(
          `결제에 실패했습니다: ${paymentResult.error || "알 수 없는 오류"}`
        );
        return;
      }

      // 10. 결제 성공 처리
      alert("구독에 성공하였습니다.");
      router.push("/magazines");
    } catch (error) {
      console.error("구독 처리 중 오류:", error);
      alert("구독 처리 중 오류가 발생했습니다.");
    }
  };

  return {
    handleSubscribe,
  };
};
