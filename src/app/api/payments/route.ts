import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/payments
 * billingKey를 사용한 portone v2 결제 API
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 요청 데이터 파싱
    const body = await request.json();
    const { billingKey, orderName, amount, customer } = body;

    // 2. 필수 필드 검증
    if (!billingKey || !orderName || !amount || !customer?.id) {
      return NextResponse.json(
        { 
          success: false, 
          error: '필수 필드가 누락되었습니다.' 
        },
        { status: 400 }
      );
    }

    // 3. paymentId 생성 (고유한 결제 ID)
    const paymentId = `payment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 4. portone API 시크릿 키 확인
    const portoneApiSecret = process.env.PORTONE_API_SECRET;
    if (!portoneApiSecret) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'PORTONE_API_SECRET 환경 변수가 설정되지 않았습니다.' 
        },
        { status: 500 }
      );
    }

    // 5. portone v2 API 호출 - billingKey를 사용한 결제 요청
    const portoneResponse = await fetch(
      `https://api.portone.io/payments/${encodeURIComponent(paymentId)}/billing-key`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `PortOne ${portoneApiSecret}`,
        },
        body: JSON.stringify({
          billingKey,
          orderName,
          amount: {
            total: amount,
          },
          customer: {
            id: customer.id,
          },
          currency: 'KRW',
        }),
      }
    );

    // 6. portone 응답 처리
    const portoneData = await portoneResponse.json();

    if (!portoneResponse.ok) {
      console.error('Portone API 오류:', portoneData);
      return NextResponse.json(
        { 
          success: false,
          error: portoneData.message || '결제 요청 실패',
        },
        { status: portoneResponse.status }
      );
    }

    // 7. 성공 응답 반환 (DB 저장 없이)
    return NextResponse.json({
      success: true,
      paymentId,
      portoneData,
    });

  } catch (error) {
    console.error('결제 API 오류:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}



