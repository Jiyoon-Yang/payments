import { supabase } from '@/lib/supabase';

/**
 * 로그인 액션 가드
 * 로그인 여부를 검사하고, 비로그인시 알림을 표시하고 작업을 중단합니다.
 * @returns {Promise<boolean>} 로그인 상태 (true: 로그인됨, false: 비로그인)
 */
export const useGuardAuth = () => {
  const checkAuth = async (): Promise<boolean> => {
    try {
      // Supabase에서 현재 세션 확인
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('세션 조회 오류:', error);
        alert('로그인 후 이용 가능합니다');
        return false;
      }

      // 세션이 없거나 사용자가 없으면 비로그인 상태
      if (!session || !session.user) {
        alert('로그인 후 이용 가능합니다');
        return false;
      }

      // 로그인 상태
      return true;
    } catch (error) {
      console.error('인증 확인 실패:', error);
      alert('로그인 후 이용 가능합니다');
      return false;
    }
  };

  return {
    checkAuth,
  };
};

