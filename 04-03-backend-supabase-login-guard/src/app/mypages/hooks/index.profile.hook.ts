import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export interface UserProfile {
  profileImage: string | null;
  name: string;
  email: string;
  joinDate: string;
}

export const useProfile = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Supabase Auth에서 현재 로그인한 사용자 정보 가져오기
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          throw new Error(authError.message);
        }

        if (!user) {
          throw new Error('로그인이 필요합니다.');
        }

        // 사용자 프로필 정보 구성
        const userProfile: UserProfile = {
          profileImage: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '사용자',
          email: user.email || '',
          joinDate: user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
          }).replace(/\. /g, '.').replace(/\.$/, '') : '',
        };

        setProfile(userProfile);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '프로필을 불러올 수 없습니다.';
        setError(errorMessage);
        console.error('프로필 조회 오류:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  return {
    profile,
    isLoading,
    error,
  };
};

