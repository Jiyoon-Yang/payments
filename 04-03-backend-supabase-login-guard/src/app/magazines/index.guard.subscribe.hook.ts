import { supabase } from '@/lib/supabase';

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
  created_at: string;
  user_id: string;
}

/**
 * 회원 구독 GUARD
 * 구독 상태를 조회하여 구독 여부를 검사하고, 비구독시 알림을 표시하고 작업을 중단합니다.
 * @returns {Promise<boolean>} 구독 상태 (true: 구독중, false: 비구독)
 */
export const useGuardSubscribe = () => {
  const checkSubscribe = async (): Promise<boolean> => {
    try {
      // 1-1) 로그인된 사용자 정보 확인
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        alert('구독 후 이용 가능합니다.');
        return false;
      }

      // 1-2) payment 테이블에서 내 결제 정보만 조회 (user_id 필터링)
      const { data: payments, error: fetchError } = await supabase
        .from("payment")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error('결제 정보 조회 오류:', fetchError);
        alert('구독 후 이용 가능합니다.');
        return false;
      }

      if (!payments || payments.length === 0) {
        alert('구독 후 이용 가능합니다.');
        return false;
      }

      // 1-3) transaction_key로 그룹화하고 각 그룹에서 created_at 최신 1건씩 추출
      const groupedByTransactionKey = (payments as Payment[]).reduce<Record<string, Payment>>(
        (acc: Record<string, Payment>, payment: Payment) => {
          const key = payment.transaction_key;
          if (!acc[key] || new Date(payment.created_at) > new Date(acc[key].created_at)) {
            acc[key] = payment;
          }
          return acc;
        },
        {}
      );

      // 그룹화된 결과를 배열로 변환
      const latestPayments: Payment[] = Object.values(groupedByTransactionKey);

      // 현재 시각 계산
      const now = new Date();

      // 위 그룹 결과에서 조회: status === "Paid" && start_at <= 현재시각 <= end_grace_at
      const activeSubscriptions: Payment[] = latestPayments.filter((payment) => {
        if (payment.status !== "Paid") {
          return false;
        }

        const startAt = new Date(payment.start_at);
        const endGraceAt = new Date(payment.end_grace_at);

        return startAt <= now && now <= endGraceAt;
      });

      // 조회 결과 1건 이상이면 구독중
      if (activeSubscriptions.length > 0) {
        return true;
      } else {
        // 비구독시 알림
        alert('구독 후 이용 가능합니다.');
        return false;
      }
    } catch (error) {
      console.error('구독 상태 확인 실패:', error);
      alert('구독 후 이용 가능합니다.');
      return false;
    }
  };

  return {
    checkSubscribe,
  };
};

