import Image from 'next/image';

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <>
      <Image
        src="/logo-dark.png"
        alt="hako"
        width={size}
        height={size}
        className="hidden dark:block rounded-lg"
        priority
        unoptimized
      />
      <Image
        src="/logo-light.png"
        alt="hako"
        width={size}
        height={size}
        className="block dark:hidden rounded-lg"
        priority
        unoptimized
      />
    </>
  );
}
