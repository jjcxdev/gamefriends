import Image from "next/image";

export function Footer() {
  return (
    <footer className="text-center flex items-center justify-center gap-2 text-sm bg-muted p-4 text-muted-foreground py-8">
      <p className="font-gameboy text-xs">&copy; 2025 jjcx</p>
      <a
        href="https://github.com/jjcxdev/gamefriends"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Image
          src="/images/github.png"
          alt="github"
          width={20}
          height={20}
          className="dark:invert opacity-50 dark:opacity-70"
        />
      </a>
    </footer>
  );
}
