import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface UserProfile {
  user: User | null;
  profileImage: string | null;
  name: string | null;
  isLoading: boolean;
}

export const useLoginLogoutStatus = () => {
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile>({
    user: null,
    profileImage: null,
    name: null,
    isLoading: true,
  });

  // 로그인 상태 조회
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Supabase에서 현재 세션 확인
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('세션 조회 오류:', error);
          setUserProfile({
            user: null,
            profileImage: null,
            name: null,
            isLoading: false,
          });
          return;
        }

        if (session?.user) {
          // 사용자 정보 설정
          const user = session.user;
          const profileImage = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
          const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || null;

          setUserProfile({
            user,
            profileImage,
            name,
            isLoading: false,
          });
        } else {
          setUserProfile({
            user: null,
            profileImage: null,
            name: null,
            isLoading: false,
          });
        }
      } catch (error) {
        console.error('사용자 프로필 조회 실패:', error);
        setUserProfile({
          user: null,
          profileImage: null,
          name: null,
          isLoading: false,
        });
      }
    };

    fetchUserProfile();

    // 인증 상태 변경 리스너 등록
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const user = session.user;
        const profileImage = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;
        const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || null;

        setUserProfile({
          user,
          profileImage,
          name,
          isLoading: false,
        });
      } else {
        setUserProfile({
          user: null,
          profileImage: null,
          name: null,
          isLoading: false,
        });
      }
    });

    // 클린업
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // 로그아웃 함수
  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('로그아웃 오류:', error);
        alert('로그아웃 중 오류가 발생했습니다.');
        return;
      }

      // 로그아웃 성공 시 로그인 페이지로 이동
      router.push('/auth/login');
    } catch (error) {
      console.error('로그아웃 실패:', error);
      alert('로그아웃 중 예상치 못한 오류가 발생했습니다.');
    }
  };

  // 마이페이지로 이동
  const navigateToMyPage = () => {
    router.push('/mypages');
  };

  // 로그인 페이지로 이동
  const navigateToLogin = () => {
    router.push('/auth/login');
  };

  return {
    isLoggedIn: !!userProfile.user,
    profileImage: userProfile.profileImage,
    name: userProfile.name,
    isLoading: userProfile.isLoading,
    handleLogout,
    navigateToMyPage,
    navigateToLogin,
  };
};

