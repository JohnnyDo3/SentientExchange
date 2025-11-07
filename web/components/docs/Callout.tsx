interface CalloutProps {
  type?: 'info' | 'warning' | 'tip' | 'danger';
  children: React.ReactNode;
}

export function Callout({ type = 'info', children }: CalloutProps) {
  const styles = {
    info: {
      border: 'border-blue-500',
      bg: 'bg-blue-900/10',
      icon: '💡',
      title: 'Info',
    },
    warning: {
      border: 'border-yellow-500',
      bg: 'bg-yellow-900/10',
      icon: '⚠️',
      title: 'Warning',
    },
    tip: {
      border: 'border-green-500',
      bg: 'bg-green-900/10',
      icon: '✨',
      title: 'Tip',
    },
    danger: {
      border: 'border-red-500',
      bg: 'bg-red-900/10',
      icon: '🚨',
      title: 'Important',
    },
  };

  const style = styles[type];

  return (
    <div className={`my-6 p-4 rounded-lg border-l-4 ${style.border} ${style.bg}`}>
      <div className="flex items-start gap-3">
        <span className="text-2xl">{style.icon}</span>
        <div className="flex-1">
          <div className="font-semibold text-purple-300 mb-1">{style.title}</div>
          <div className="text-gray-300">{children}</div>
        </div>
      </div>
    </div>
  );
}
