type ContainerProps = {
  children: React.ReactNode;
  className?: string;
};

export function Container({ children, className = '' }: ContainerProps) {
  return (
    <div className={`mx-auto w-full max-w-[1500px] px-6 sm:px-8 lg:px-12 xl:px-16 ${className}`}>
      {children}
    </div>
  );
}
