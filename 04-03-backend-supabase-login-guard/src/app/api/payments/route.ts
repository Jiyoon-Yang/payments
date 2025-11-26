import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/payments
 * PortOne v2를 사용한 빌링키 기반 정기결제 API
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 요청 데이터 파싱
    const body = await request.json();
    const { billingKey, orderName, amount, customer, customData } = body;

    // 1-1. 필수 데이터 검증
    if (!billingKey || !orderName || !amount || !customer?.id || !customData) {
      return NextResponse.json(
        { success: false, error: "필수 데이터가 누락되었습니다." },
        { status: 400 }
      );
    }

    // 1-2. 환경 변수 확인
    const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET;
    if (!PORTONE_API_SECRET) {
      return NextResponse.json(
        { success: false, error: "PORTONE_API_SECRET이 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 2. 인가: API 요청자 검증 (가장 간단한 방식 - Supabase 세션 확인)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Supabase 설정이 누락되었습니다." },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: request.headers.get("Authorization") || "",
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "인증이 필요합니다." },
        { status: 401 }
      );
    }

    // 3. 결제가능여부 검증: 인가된 user_id === customer.id
    if (user.id !== customer.id) {
      return NextResponse.json(
        { success: false, error: "본인의 결제만 처리할 수 있습니다." },
        { status: 403 }
      );
    }

    // 4. 고유한 paymentId 생성 (타임스탬프 + 랜덤)
    const paymentId = `payment_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;

    // 5. PortOne API로 빌링키 결제 요청
    const paymentResponse = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(
        paymentId
      )}/billing-key`,
      {
        method: "POST",
        headers: {
          Authorization: `PortOne ${PORTONE_API_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billingKey,
          orderName,
          customer: {
            id: customer.id,
          },
          amount: {
            total: amount,
          },
          customData: customData, // 로그인된 user_id
          currency: "KRW",
        }),
      }
    );

    // 6. PortOne 응답 확인
    const paymentResult = await paymentResponse.json();

    if (!paymentResponse.ok) {
      console.error("PortOne 결제 실패:", paymentResult);
      return NextResponse.json(
        {
          success: false,
          error: "결제 처리 중 오류가 발생했습니다.",
          details: paymentResult,
        },
        { status: paymentResponse.status }
      );
    }

    // 7. 성공 응답 반환 (DB에 저장하지 않음)
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("API 처리 중 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "서버 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

