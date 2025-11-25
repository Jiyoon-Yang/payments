'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginSuccessPage() {
  const router = useRouter();
  const [, setIsLoading] = useState(true);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let subscription: { unsubscribe: () => void } | null = null;

    const checkSession = async () => {
      try {
        // 1. 인증 상태 변경 구독 (OAuth 콜백 처리)
        const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              // 로그인 성공 시 메인페이지로 이동
              setIsLoading(false);
              router.push('/magazines');
            } else if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
              // 로그아웃 또는 세션 없음 시 로그인 페이지로 이동
              setIsLoading(false);
              router.push('/auth/login');
            }
          }
        );

        subscription = authSubscription;

        // 2. 현재 세션 확인
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('세션 확인 오류:', error);
          setIsLoading(false);
          router.push('/auth/login');
          return;
        }

        // 3. 세션이 이미 있으면 즉시 메인페이지로 이동
        if (session) {
          setIsLoading(false);
          router.push('/magazines');
          return;
        }

        // 4. 세션이 없으면 일정 시간 후 타임아웃 처리
        timeout = setTimeout(() => {
          setIsLoading(false);
          router.push('/auth/login');
        }, 10000); // 10초 타임아웃

      } catch (error) {
        console.error('세션 확인 중 오류 발생:', error);
        setIsLoading(false);
        router.push('/auth/login');
      }
    };

    checkSession();

    // 5. 정리 함수
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [router]);

  return (
    <div className="magazine-container">
      <div className="magazine-loading">
        <p>로그인 중...</p>
        <p style={{ fontSize: '0.9rem', color: '#666', marginTop: '0.5rem' }}>
          잠시만 기다려주세요
        </p>
      </div>
    </div>
  );
}

