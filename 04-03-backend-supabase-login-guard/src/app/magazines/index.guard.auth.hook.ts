import { useLoginLogoutStatus } from "./index.login.logout.status.hook";

/**
 * 로그인 액션GUARD 훅
 * 로그인 여부를 검사하고, 비로그인시 알림을 띄우고 작업을 중단합니다.
 */
export const useGuardAuth = () => {
  const { isLoggedIn } = useLoginLogoutStatus();

  /**
   * 로그인 액션GUARD
   * @param action - 로그인 상태일 때 실행할 액션 함수
   * @returns 로그인 여부에 따라 액션 실행 여부를 결정
   */
  const guardAuth = <T extends (...args: unknown[]) => unknown>(
    action: T
  ): ((...args: Parameters<T>) => void) => {
    return (...args: Parameters<T>) => {
      if (!isLoggedIn) {
        alert("로그인 후 이용 가능합니다");
        return;
      }
      action(...args);
    };
  };

  return {
    guardAuth,
    isLoggedIn,
  };
};
