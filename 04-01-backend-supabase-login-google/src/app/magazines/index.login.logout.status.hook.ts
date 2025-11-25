'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface LoginStatus {
  isLoggedIn: boolean;
  user: User | null;
  loading: boolean;
}

export const useLoginLogoutStatus = () => {
  const router = useRouter();
  const [loginStatus, setLoginStatus] = useState<LoginStatus>({
    isLoggedIn: false,
    user: null,
    loading: true,
  });

  // 로그인 상태 조회
  const checkAuthStatus = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('세션 조회 오류:', error);
        setLoginStatus({
          isLoggedIn: false,
          user: null,
          loading: false,
        });
        return;
      }

      if (session?.user) {
        setLoginStatus({
          isLoggedIn: true,
          user: session.user,
          loading: false,
        });
      } else {
        setLoginStatus({
          isLoggedIn: false,
          user: null,
          loading: false,
        });
      }
    } catch (error) {
      console.error('인증 상태 확인 중 오류:', error);
      setLoginStatus({
        isLoggedIn: false,
        user: null,
        loading: false,
      });
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('로그아웃 오류:', error);
        alert('로그아웃에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      // 로그아웃 성공 시 상태 업데이트
      setLoginStatus({
        isLoggedIn: false,
        user: null,
        loading: false,
      });

      // 로그인 페이지로 이동
      router.push('/auth/login');
    } catch (error) {
      console.error('로그아웃 중 예외 발생:', error);
      alert('로그아웃 중 오류가 발생했습니다.');
    }
  };

  // 초기 로드 및 인증 상태 변경 감지
  useEffect(() => {
    // 초기 상태 확인
    checkAuthStatus();

    // 인증 상태 변경 구독
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setLoginStatus({
            isLoggedIn: true,
            user: session.user,
            loading: false,
          });
        } else if (event === 'SIGNED_OUT' || (!session && event !== 'INITIAL_SESSION')) {
          setLoginStatus({
            isLoggedIn: false,
            user: null,
            loading: false,
          });
        }
      }
    );

    // 정리 함수
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    ...loginStatus,
    handleLogout,
    refetch: checkAuthStatus,
  };
};

