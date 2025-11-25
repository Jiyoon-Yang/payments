import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/payments/cancel
 * PortOne v2를 사용한 결제 취소 API
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 요청 데이터 파싱
    const body = await request.json();
    const { transactionKey } = body;

    // 1-1. 필수 데이터 검증
    if (!transactionKey) {
      return NextResponse.json(
        { success: false, error: "transactionKey가 누락되었습니다." },
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

    // 2. 인가: API 요청자 검증
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "인증 토큰이 필요합니다." },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "인증에 실패했습니다." },
        { status: 401 }
      );
    }

    const userId = user.id;

    // 3. 취소가능여부 검증: payment 테이블 조회
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from("payment")
      .select("*")
      .eq("user_id", userId)
      .eq("transaction_key", transactionKey)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { success: false, error: "취소 가능한 결제 내역을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // 4. PortOne API로 결제 취소 요청
    console.log("결제 취소 요청:", transactionKey);
    const cancelResponse = await fetch(
      `https://api.portone.io/payments/${transactionKey}/cancel`,
      {
        method: "POST",
        headers: {
          Authorization: `PortOne ${PORTONE_API_SECRET}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: "취소 사유 없음",
        }),
      }
    );

    // 5. PortOne 응답 확인
    const cancelResult = await cancelResponse.json();

    if (!cancelResponse.ok) {
      console.error("PortOne 결제 취소 실패:", cancelResult);
      return NextResponse.json(
        {
          success: false,
          error: "결제 취소 처리 중 오류가 발생했습니다.",
          details: cancelResult,
        },
        { status: cancelResponse.status }
      );
    }

    console.log("결제 취소 성공:", cancelResult);

    // 6. 성공 응답 반환 (DB에 저장하지 않음)
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

