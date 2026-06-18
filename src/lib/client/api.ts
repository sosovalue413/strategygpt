export function appApiHeaders(base: HeadersInit = {}) {
  const token = process.env.NEXT_PUBLIC_STRATEGYGPT_API_TOKEN;
  return {
    ...base,
    ...(token ? { "x-strategygpt-token": token } : {})
  };
}
