import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * POST /api/portone
 * PortOne v2 구독 결제 웹훅 처리 API
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 요청 데이터 파싱
    const body = await request.json();
    const { payment_id, status } = body;

    // 2. 필수 필드 검증
    if (!payment_id || !status) {
      return NextResponse.json(
        {
          success: false,
          error: "필수 필드가 누락되었습니다. (payment_id, status)",
        },
        { status: 400 }
      );
    }

    // 3. status 검증
    if (status !== "Paid" && status !== "Cancelled") {
      return NextResponse.json(
        {
          success: false,
          error: 'status는 "Paid" 또는 "Cancelled"이어야 합니다.',
        },
        { status: 400 }
      );
    }

    // 4. PortOne API 시크릿 키 확인
    const portoneApiSecret = process.env.PORTONE_API_SECRET;
    if (!portoneApiSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "PORTONE_API_SECRET 환경 변수가 설정되지 않았습니다.",
        },
        { status: 500 }
      );
    }

    // 5. PortOne v2 API로 결제 정보 조회
    const paymentInfoResponse = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(payment_id)}`,
      {
        method: "GET",
        headers: {
          Authorization: `PortOne ${portoneApiSecret}`,
        },
      }
    );

    if (!paymentInfoResponse.ok) {
      const errorData = await paymentInfoResponse.json();
      console.error("PortOne 결제 정보 조회 오류:", errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData.message || "결제 정보 조회 실패",
        },
        { status: paymentInfoResponse.status }
      );
    }

    const paymentInfo = await paymentInfoResponse.json();

    // 6. 구독 결제 완료 시나리오 처리
    if (status === "Paid") {
      // 6-1. 날짜 계산
      const now = new Date();
      const startAt = now.toISOString();

      const endAt = new Date(now);
      endAt.setDate(endAt.getDate() + 30);

      const endGraceAt = new Date(now);
      endGraceAt.setDate(endGraceAt.getDate() + 31);

      // next_schedule_at: end_at + 1일 오전 10시~11시 사이 임의 시각
      const nextScheduleAt = new Date(endAt);
      nextScheduleAt.setDate(nextScheduleAt.getDate() + 1);
      nextScheduleAt.setHours(10 + Math.random(), Math.random() * 60, 0, 0);

      // UUID 생성 (표준 UUID 형식)
      const nextScheduleId = crypto.randomUUID();

      // 6-2. Supabase payment 테이블에 저장
      const { data: paymentData, error: insertError } = await supabase
        .from("payment")
        .insert({
          transaction_key: paymentInfo.paymentId || payment_id,
          amount: paymentInfo.amount?.total || 0,
          status: "Paid",
          start_at: startAt,
          end_at: endAt.toISOString(),
          end_grace_at: endGraceAt.toISOString(),
          next_schedule_at: nextScheduleAt.toISOString(),
          next_schedule_id: nextScheduleId,
        })
        .select();

      if (insertError) {
        console.error("Supabase 저장 오류:", insertError);
        return NextResponse.json(
          {
            success: false,
            error: "결제 정보 저장 실패: " + insertError.message,
          },
          { status: 500 }
        );
      }

      // 7. 다음 달 구독 예약
      if (paymentInfo.billingKey) {
        const scheduleResponse = await fetch(
          `https://api.portone.io/payments/${encodeURIComponent(
            nextScheduleId
          )}/schedule`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `PortOne ${portoneApiSecret}`,
            },
            body: JSON.stringify({
              payment: {
                billingKey: paymentInfo.billingKey,
                orderName: paymentInfo.orderName || "구독 결제",
                customer: {
                  id: paymentInfo.customer?.id || "unknown",
                },
                amount: {
                  total: paymentInfo.amount?.total || 0,
                },
                currency: "KRW",
              },
              timeToPay: nextScheduleAt.toISOString(),
            }),
          }
        );

        if (!scheduleResponse.ok) {
          const scheduleError = await scheduleResponse.json();
          console.error("구독 예약 오류:", scheduleError);
          // 예약 실패해도 결제는 성공했으므로 경고만 로그
          console.warn("다음 달 구독 예약에 실패했지만 결제는 완료되었습니다.");
        }
      }

      return NextResponse.json({
        success: true,
        message: "구독 결제가 완료되었습니다.",
        data: paymentData,
      });
    }

    // 8. 취소 시나리오 처리
    if (status === "Cancelled") {
      // 취소 처리 로직 (필요 시 추가)
      return NextResponse.json({
        success: true,
        message: "결제가 취소되었습니다.",
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("구독 결제 API 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}
