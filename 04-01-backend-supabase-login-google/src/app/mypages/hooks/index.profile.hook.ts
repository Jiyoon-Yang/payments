import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * 사용자 프로필 타입 정의
 */
export interface UserProfile {
  profileImage: string | null;
  name: string;
  email: string;
  joinDate: string;
}

/**
 * 프로필 조회 Hook
 * Supabase Auth에서 현재 로그인한 사용자의 프로필 정보를 조회합니다.
 */
export function useProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * 프로필 조회 함수
   */
  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 1. 현재 세션 확인
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`세션 확인 실패: ${sessionError.message}`);
      }

      if (!session || !session.user) {
        throw new Error("로그인이 필요합니다.");
      }

      const user = session.user;

      // 2. 사용자 정보 추출
      // 프로필사진: user.user_metadata.avatar_url 또는 user.user_metadata.avatar 또는 user.user_metadata.picture
      const profileImage = 
        user.user_metadata?.avatar_url || 
        user.user_metadata?.avatar || 
        user.user_metadata?.picture || 
        null;

      // 이름: user.user_metadata.full_name 또는 user.user_metadata.name 또는 user.user_metadata.display_name
      const name = 
        user.user_metadata?.full_name || 
        user.user_metadata?.name || 
        user.user_metadata?.display_name || 
        user.email?.split("@")[0] || 
        "사용자";

      // 이메일: user.email
      const email = user.email || "";

      // 가입일: user.created_at을 포맷팅 (예: "2024.03")
      const joinDate = user.created_at 
        ? new Date(user.created_at).toLocaleDateString("ko-KR", {
            year: "numeric",
            month: "2-digit",
          }).replace(/\.\s*/g, ".").replace(/\s/g, "") // "2024.03" 형식으로 변환
        : "";

      setProfile({
        profileImage,
        name,
        email,
        joinDate,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.";
      setError(errorMessage);
      console.error("프로필 조회 오류:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 프로필 조회
  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    isLoading,
    error,
    refetch: fetchProfile,
  };
}

