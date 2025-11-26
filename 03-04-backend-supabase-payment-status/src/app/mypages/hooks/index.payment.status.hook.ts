"use client"

import { useState, useEffect } from "react";
import { supabase, Payment } from "@/lib/supabase";

interface PaymentStatusResult {
  isSubscribed: boolean;
  status: "subscribed" | "free";
  transactionKey?: string;
}

export function usePaymentStatus() {
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusResult>({
    isSubscribed: false,
    status: "free"
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkPaymentStatus();
  }, []);

  const checkPaymentStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Step 1: payment 테이블의 모든 데이터 조회
      const { data: payments, error: fetchError } = await supabase
        .from('payment')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw new Error(`데이터 조회 실패: ${fetchError.message}`);
      }

      if (!payments || payments.length === 0) {
        // 결제 내역이 없으면 Free 상태
        setPaymentStatus({
          isSubscribed: false,
          status: "free"
        });
        return;
      }

      // Step 2: transaction_key 별로 그룹화하고 각 그룹에서 최신 1건씩 추출
      const groupedByTransactionKey = payments.reduce((acc: Record<string, Payment>, payment: Payment) => {
        const key = payment.transaction_key;
        
        // 그룹에 해당 transaction_key가 없거나, 현재 payment가 더 최신이면 업데이트
        if (!acc[key] || new Date(payment.created_at) > new Date(acc[key].created_at)) {
          acc[key] = payment;
        }
        
        return acc;
      }, {});

      // 그룹화된 결과를 배열로 변환
      const latestPayments = Object.values(groupedByTransactionKey);

      // Step 3: 현재 시각 기준으로 유효한 결제 필터링
      const now = new Date();
      const activePayments = latestPayments.filter((payment: Payment) => {
        const startAt = new Date(payment.start_at);
        const endGraceAt = new Date(payment.end_grace_at);
        
        // status === "Paid" 이고 start_at <= 현재시각 <= end_grace_at 조건 체크
        return (
          payment.status === "Paid" &&
          startAt <= now &&
          now <= endGraceAt
        );
      });

      // Step 4: 조회 결과에 따른 상태 결정
      if (activePayments.length > 0) {
        // 1건 이상: 구독중 상태
        setPaymentStatus({
          isSubscribed: true,
          status: "subscribed",
          transactionKey: activePayments[0].transaction_key
        });
      } else {
        // 0건: Free 상태
        setPaymentStatus({
          isSubscribed: false,
          status: "free"
        });
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다";
      setError(errorMessage);
      console.error("결제 상태 조회 오류:", err);
      
      // 오류 발생 시 기본값으로 Free 상태 설정
      setPaymentStatus({
        isSubscribed: false,
        status: "free"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    paymentStatus,
    isLoading,
    error,
    refetch: checkPaymentStatus
  };
}
