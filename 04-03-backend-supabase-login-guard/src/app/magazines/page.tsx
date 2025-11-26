'use client';

import { useRouter } from 'next/navigation';
import { LogIn, LogOut, PenSquare, Sparkles, User } from "lucide-react";
import { useMagazines } from './index.binding.hook';
import { useLoginLogoutStatus } from './index.login.logout.status.hook';
import { useGuardAuth } from './index.guard.auth.hook';
import { useGuardSubscribe } from './index.guard.subscribe.hook';

const getCategoryColor = (category: string) => {
  const colorMap: Record<string, string> = {
    "인공지능": "magazine-category-ai",
    "웹개발": "magazine-category-web",
    "클라우드": "magazine-category-cloud",
    "보안": "magazine-category-security",
    "모바일": "magazine-category-mobile",
    "데이터사이언스": "magazine-category-data",
    "블록체인": "magazine-category-blockchain",
    "DevOps": "magazine-category-devops",
  };
  
  return colorMap[category] || "magazine-category-default";
};

export default function GlossaryCards() {
  const router = useRouter();
  const { magazines, loading, error } = useMagazines();
  const { 
    isLoggedIn, 
    profileImage, 
    name, 
    handleLogout, 
    navigateToMyPage, 
    navigateToLogin 
  } = useLoginLogoutStatus();
  const { guardAuth } = useGuardAuth();
  const { guardSubscribe } = useGuardSubscribe();

  const handleCardClick = guardSubscribe((id: string) => {
    router.push(`/magazines/${id}`);
  });

  // 글쓰기 버튼 핸들러 - 회원 구독GUARD 연결
  const handleNewArticle = guardSubscribe(() => {
    router.push('/magazines/new');
  });

  // 구독하기 버튼 핸들러 - 로그인 액션GUARD 적용
  const handleSubscribe = guardAuth(() => {
    router.push('/payments');
  });

  return (
    <div className="magazine-container">
      <div className="magazine-header">
        <h1>IT 매거진</h1>
        <p className="magazine-subtitle">최신 기술 트렌드와 인사이트를 전합니다</p>
        <div className="magazine-header-actions">
          {/* 로그인 상태에 따른 조건부 렌더링 */}
          {isLoggedIn ? (
            <>
              {/* 프로필 영역 */}
              <div 
                className="magazine-header-profile"
                onClick={navigateToMyPage}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {profileImage ? (
                  <img 
                    src={profileImage} 
                    alt="프로필" 
                    className="magazine-header-avatar"
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      borderRadius: '50%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <User 
                    className="magazine-header-avatar-icon" 
                    style={{ 
                      width: '32px', 
                      height: '32px', 
                      padding: '4px',
                      borderRadius: '50%',
                      backgroundColor: '#e5e7eb'
                    }}
                  />
                )}
                <span className="magazine-header-name">{name}</span>
              </div>
              
              {/* 로그아웃 버튼 */}
              <button 
                className="magazine-header-button magazine-header-button-ghost"
                onClick={handleLogout}
              >
                <LogOut className="magazine-button-icon" />
                <span className="magazine-button-text">로그아웃</span>
              </button>
            </>
          ) : (
            /* 로그인 버튼 */
            <button 
              className="magazine-header-button magazine-header-button-ghost"
              onClick={navigateToLogin}
            >
              <LogIn className="magazine-button-icon" />
              <span className="magazine-button-text">로그인</span>
            </button>
          )}
          
          {/* 글쓰기 버튼 */}
          <button 
            className="magazine-header-button magazine-header-button-primary"
            onClick={handleNewArticle}
          >
            <PenSquare className="magazine-button-icon" />
            <span className="magazine-button-text">글쓰기</span>
          </button>
          
          {/* 구독하기 버튼 */}
          <button 
            className="magazine-header-button magazine-header-button-payment"
            onClick={handleSubscribe}
          >
            <Sparkles className="magazine-button-icon" />
            <span className="magazine-button-text">구독하기</span>
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="magazine-loading">
          <p>데이터를 불러오는 중...</p>
        </div>
      )}

      {error && (
        <div className="magazine-error">
          <p>오류: {error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="magazine-grid">
          {magazines.map((magazine) => (
            <article 
              key={magazine.id} 
              className="magazine-card"
              onClick={() => handleCardClick(magazine.id as string)}
              style={{ cursor: 'pointer' }}
            >
              <div className="magazine-card-image">
                <img 
                  src={magazine.image_url ?? ''}
                  alt={magazine.title}
                />
                <div className={`magazine-card-category ${getCategoryColor(magazine.category)}`}>
                  {magazine.category}
                </div>
              </div>
              
              <div className="magazine-card-content">
                <h2 className="magazine-card-title">{magazine.title}</h2>
                <p className="magazine-card-summary">{magazine.description}</p>
                
                {magazine.tags && magazine.tags.length > 0 && (
                  <div className="magazine-card-tags">
                    {magazine.tags.map((tag, tagIndex) => (
                      <span key={tagIndex} className="magazine-tag">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
