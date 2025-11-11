import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * 구독 취소 훅
 * API: POST /api/payments/cancel
 * 요청: { transactionKey }
 * 응답: { success: boolean }
 */
export const usePaymentCancel = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 구독 취소 요청
   * @param transactionKey - 거래 키
   */
  const cancelSubscription = async (transactionKey: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. API 요청
      const response = await fetch("/api/payments/cancel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transactionKey,
        }),
      });

      const result = await response.json();

      // 2. 응답 확인
      if (!response.ok || !result.success) {
        throw new Error(result.error || "구독 취소에 실패했습니다.");
      }

      // 3. 성공 처리
      alert("구독이 취소되었습니다.");
      router.push("/magazines");

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "구독 취소 중 오류가 발생했습니다.";
      setError(errorMessage);
      alert(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    cancelSubscription,
    isLoading,
    error,
  };
};

