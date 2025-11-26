"use client"

import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePaymentCancel } from "./hooks/index.payment.cancel.hook";
import { usePaymentStatus } from "./hooks/index.payment.status.hook";

interface UserProfile {
  profileImage: string;
  nickname: string;
  bio: string;
  joinDate: string;
}

const mockUserData: UserProfile = {
  profileImage: "https://images.unsplash.com/photo-1613145997970-db84a7975fbb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwcm9maWxlJTIwcG9ydHJhaXQlMjBwZXJzb258ZW58MXx8fHwxNzYyNTkxMjU5fDA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral",
  nickname: "테크러버",
  bio: "최신 IT 트렌드와 개발 이야기를 공유합니다",
  joinDate: "2024.03"
};

function GlossaryMagazinesMypage() {
  const router = useRouter();
  const [user] = useState<UserProfile>(mockUserData);
  const { cancelPayment, isLoading: isCancelling } = usePaymentCancel();
  const { paymentStatus, isLoading: isLoadingStatus, error, refetch } = usePaymentStatus();

  const handleBackToList = () => {
    router.push('/magazines');
  };

  const handleSubscriptionToggle = () => {
    // 구독하기 버튼 클릭 시 결제 페이지로 이동
    router.push('/payments');
  };

  const handleCancelSubscription = async () => {
    if (!confirm("구독을 취소하시겠습니까?")) {
      return;
    }

    // transactionKey가 없는 경우 처리
    if (!paymentStatus.transactionKey) {
      alert("결제 정보를 찾을 수 없습니다.");
      return;
    }

    // 포트원 결제 취소 API 호출
    const result = await cancelPayment(paymentStatus.transactionKey);
    
    // 성공 시 결제 상태 다시 조회
    if (result.success) {
      refetch(); // 결제 상태 재조회
    } else if (result.error) {
      alert(`구독 취소 실패: ${result.error}`);
    }
  };

  // paymentStatus에서 구독 상태 가져오기
  const isSubscribed = paymentStatus.isSubscribed;
  const statusMessage = paymentStatus.status === "subscribed" ? "구독중" : "Free";

  return (
    <div className="mypage-wrapper">
      <button className="mypage-back-btn" onClick={handleBackToList}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.5 15L7.5 10L12.5 5" />
        </svg>
        목록으로
      </button>

      <div className="mypage-header">
        <h1>IT 매거진 구독</h1>
        <p className="mypage-header-desc">프리미엄 콘텐츠를 제한 없이 이용하세요</p>
        {error && (
          <p style={{ color: 'red', marginTop: '10px' }}>
            오류: {error}
          </p>
        )}
      </div>

      <div className="mypage-grid">
        {/* 프로필 카드 */}
        <div className="mypage-profile-card">
          <img 
            src={user.profileImage} 
            alt={user.nickname}
            className="mypage-avatar"
          />
          <h2 className="mypage-name">{user.nickname}</h2>
          <p className="mypage-bio-text">{user.bio}</p>
          <div className="mypage-join-date">가입일 {user.joinDate}</div>
        </div>

        {/* 구독 플랜 카드 */}
        <div className={`mypage-subscription-card ${isSubscribed ? 'active' : ''}`}>
          <div className="mypage-subscription-header">
            <h3 className="mypage-card-title">구독 플랜</h3>
            {isLoadingStatus ? (
              <span className="mypage-badge-active">로딩중...</span>
            ) : (
              <span className="mypage-badge-active">{statusMessage}</span>
            )}
          </div>

          {isSubscribed ? (
            <div className="mypage-subscription-active">
              <div className="mypage-plan-name">IT Magazine Premium</div>
              <div className="mypage-plan-features">
                <div className="mypage-feature-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.3337 4L6.00033 11.3333L2.66699 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>모든 프리미엄 콘텐츠 무제한 이용</span>
                </div>
                <div className="mypage-feature-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.3337 4L6.00033 11.3333L2.66699 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>매주 새로운 IT 트렌드 리포트</span>
                </div>
                <div className="mypage-feature-item">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M13.3337 4L6.00033 11.3333L2.66699 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>광고 없는 깔끔한 읽기 환경</span>
                </div>
              </div>
              <button 
                className="mypage-cancel-btn"
                onClick={handleCancelSubscription}
                disabled={isCancelling || isLoadingStatus}
              >
                {isCancelling ? "처리중..." : "구독 취소"}
              </button>
            </div>
          ) : (
            <div className="mypage-subscription-inactive">
              <div className="mypage-unsubscribed-message">
                구독하고 프리미엄 콘텐츠를 즐겨보세요
              </div>
              <div className="mypage-plan-preview">
                <div className="mypage-preview-item">✓ 모든 프리미엄 콘텐츠</div>
                <div className="mypage-preview-item">✓ 매주 트렌드 리포트</div>
                <div className="mypage-preview-item">✓ 광고 없는 환경</div>
              </div>
              <button 
                className="mypage-subscribe-btn"
                onClick={handleSubscriptionToggle}
                disabled={isLoadingStatus}
              >
                {isLoadingStatus ? "로딩중..." : "지금 구독하기"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default GlossaryMagazinesMypage;
