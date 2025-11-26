'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginSuccessPage() {
  const router = useRouter();
  const [isSessionReady, setIsSessionReady] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        
        // 세션이 설정될 때까지 폴링
        const checkInterval = setInterval(async () => {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // 세션이 확인되면
            setIsSessionReady(true);
            clearInterval(checkInterval);
            
            // 약간의 딜레이 후 메인 페이지로 이동
            setTimeout(() => {
              router.push('/magazines');
            }, 500);
          }
        }, 300); // 300ms마다 세션 확인

        // 최대 10초 후에는 타임아웃
        const timeout = setTimeout(() => {
          clearInterval(checkInterval);
          // 세션을 확인하지 못해도 이동
          router.push('/magazines');
        }, 10000);

        return () => {
          clearInterval(checkInterval);
          clearTimeout(timeout);
        };
      } catch (error) {
        console.error('세션 확인 중 오류:', error);
        // 오류 발생 시에도 메인 페이지로 이동
        router.push('/magazines');
      }
    };

    checkSession();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        {/* 로딩 스피너 */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-blue-200 rounded-full"></div>
            <div className="w-20 h-20 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
          </div>
        </div>

        {/* 성공 아이콘 */}
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
            <svg 
              className="w-10 h-10 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="3" 
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* 메시지 */}
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          {isSessionReady ? '로그인 완료!' : '로그인 처리 중...'}
        </h1>
        <p className="text-gray-600 text-lg mb-2">
          {isSessionReady ? '환영합니다! 🎉' : '세션을 설정하고 있습니다'}
        </p>
        <p className="text-gray-500 text-sm">
          {isSessionReady ? '메인 페이지로 이동 중입니다...' : '잠시만 기다려주세요...'}
        </p>

        {/* 로딩 도트 애니메이션 */}
        <div className="mt-6 flex justify-center space-x-2">
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
