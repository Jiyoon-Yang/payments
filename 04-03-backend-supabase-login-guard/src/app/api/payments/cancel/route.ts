import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!PORTONE_API_SECRET) {
      return NextResponse.json(
        { success: false, error: "PORTONE_API_SECRET이 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { success: false, error: "Supabase 환경 변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    // 2. 인가: API 요청자 검증 (Authorization 헤더 또는 쿠키 기반 인증)
    const authHeader = request.headers.get("authorization");
    let supabase;

    if (authHeader?.startsWith("Bearer ")) {
      // Authorization 헤더가 있는 경우
      const token = authHeader.substring(7);
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      });
    } else {
      // 쿠키 기반 인증
      const cookieStore = await cookies();
      supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
          headers: {
            cookie: cookieStore
              .getAll()
              .map((cookie) => `${cookie.name}=${cookie.value}`)
              .join("; "),
          },
        },
      });
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "인증되지 않은 사용자입니다." },
        { status: 401 }
      );
    }

    const userId = user.id;
    console.log("인증된 사용자 ID:", userId);

    // 3. 취소가능여부 검증
    // 3-1. payment 테이블 목록 조회
    const { data: payments, error: queryError } = await supabase
      .from("payment")
      .select("*")
      .eq("user_id", userId)
      .eq("transaction_key", transactionKey);

    if (queryError) {
      console.error("payment 테이블 조회 오류:", queryError);
      return NextResponse.json(
        {
          success: false,
          error: "결제 정보 조회 중 오류가 발생했습니다.",
        },
        { status: 500 }
      );
    }

    // 3-2. 조회 결과 없는 경우, 에러 처리
    if (!payments || payments.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "취소 권한이 없거나 결제 정보를 찾을 수 없습니다.",
        },
        { status: 403 }
      );
    }

    console.log("취소 가능한 결제 정보 확인:", payments[0]);

    // 4. transactionKey를 사용하여 portone에 결제 취소 요청
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

    // 6. db에 저장하지 않고, 응답 반환
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

