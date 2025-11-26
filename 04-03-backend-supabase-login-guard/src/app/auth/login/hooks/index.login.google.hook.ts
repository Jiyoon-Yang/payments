import { supabase } from '@/lib/supabase';

export const useGoogleLogin = () => {
  const handleGoogleLogin = async () => {
    try {
      // Supabase 설정 확인
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey || 
          supabaseUrl.includes('placeholder') || 
          supabaseAnonKey.includes('placeholder')) {
        alert('Supabase 설정이 완료되지 않았습니다. 환경 변수를 확인해주세요.');
        console.error('Supabase 환경 변수가 설정되지 않았습니다.');
        return;
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/login/success`,
        },
      });

      if (error) {
        console.error('구글 로그인 오류:', error);
        alert(`구글 로그인에 실패했습니다: ${error.message}`);
        throw error;
      }

      return data;
    } catch (error: unknown) {
      console.error('구글 로그인 중 에러 발생:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = (error as { message: string }).message;
        if (!errorMessage.includes('User cancelled')) {
          alert(`구글 로그인 중 오류가 발생했습니다: ${errorMessage || '알 수 없는 오류'}`);
        }
      }
      throw error;
    }
  };

  return { handleGoogleLogin };
};
