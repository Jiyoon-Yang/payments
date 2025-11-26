import { supabase } from "@/lib/supabase";

/**
 * Payment 테이블 타입 정의
 */
interface Payment {
  id: number;
  transaction_key: string;
  amount: number;
  status: "Paid" | "Cancel";
  start_at: string;
  end_at: string;
  end_grace_at: string;
  next_schedule_at: string;
  next_schedule_id: string;
  user_id: string;
  created_at: string;
}

/**
 * 구독 액션GUARD 훅
 * 구독 여부를 검사하고, 비구독시 알림을 띄우고 작업을 중단합니다.
 */
export const useGuardSubscribe = () => {
  /**
   * 구독 상태 확인 함수
   * @returns 구독 여부
   */
  const checkSubscription = async (): Promise<boolean> => {
    try {
      // 1-1) 로그인된 사용자 정보 확인
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return false;
      }

      // 1-1-1) 내 결제 정보만 필터링: user_id === 로그인된 user_id
      const { data: payments, error: fetchError } = await supabase
        .from("payment")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("결제 정보 조회 실패:", fetchError);
        return false;
      }

      if (!payments || payments.length === 0) {
        return false;
      }

      // 1-1-2) transaction_key로 그룹화하고 각 그룹에서 created_at 최신 1건씩 추출
      const groupedByTransactionKey = (payments as Payment[]).reduce<
        Record<string, Payment>
      >((acc: Record<string, Payment>, payment: Payment) => {
        const key = payment.transaction_key;
        if (
          !acc[key] ||
          new Date(payment.created_at) > new Date(acc[key].created_at)
        ) {
          acc[key] = payment;
        }
        return acc;
      }, {});

      // 그룹화된 결과를 배열로 변환
      const latestPayments: Payment[] = Object.values(groupedByTransactionKey);

      // 현재 시각 계산
      const now = new Date();

      // 1-1-3) 위 그룹 결과에서 조회: status === "Paid" && start_at <= 현재시각 <= end_grace_at
      const activeSubscriptions: Payment[] = latestPayments.filter(
        (payment) => {
          if (payment.status !== "Paid") {
            return false;
          }

          const startAt = new Date(payment.start_at);
          const endGraceAt = new Date(payment.end_grace_at);

          return startAt <= now && now <= endGraceAt;
        }
      );

      // 조회 결과 1건 이상이면 구독중
      return activeSubscriptions.length > 0;
    } catch (err) {
      console.error("구독 상태 확인 오류:", err);
      return false;
    }
  };

  /**
   * 구독 액션GUARD
   * @param action - 구독 상태일 때 실행할 액션 함수
   * @returns 구독 여부에 따라 액션 실행 여부를 결정
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const guardSubscribe = <T extends (...args: any[]) => any>(
    action: T
  ): ((...args: Parameters<T>) => Promise<void>) => {
    return async (...args: Parameters<T>) => {
      const isSubscribed = await checkSubscription();
      if (!isSubscribed) {
        alert("구독 후 이용 가능합니다.");
        return;
      }
      action(...args);
    };
  };

  return {
    guardSubscribe,
    checkSubscription,
  };
};
