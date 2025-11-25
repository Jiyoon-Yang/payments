'use client';

import { supabase } from '@/lib/supabase';

export const useGoogleLogin = () => {
  const handleGoogleLogin = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/login/success`,
        },
      });

      if (error) {
        console.error('구글 로그인 오류:', error);
        alert('구글 로그인에 실패했습니다. 다시 시도해주세요.');
        return;
      }

      // OAuth 리다이렉트는 자동으로 처리됩니다
      // data.url로 리다이렉트되거나, 브라우저가 자동으로 처리합니다
    } catch (error) {
      console.error('구글 로그인 중 예외 발생:', error);
      alert('구글 로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  return {
    handleGoogleLogin,
  };
};

