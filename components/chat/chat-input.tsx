'use client';

import { Send } from 'lucide-react';
import { useControllableState } from '@radix-ui/react-use-controllable-state';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/shadcn/utils';

export type ChatInputProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  onSubmit: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  autoFocus?: boolean;
};

function ChatInput({
  value: valueProp,
  defaultValue,
  onChange,
  onSubmit,
  placeholder = 'Type a message...',
  disabled = false,
  className,
  autoFocus,
}: ChatInputProps) {
  const [value, setValue] = useControllableState({
    prop: valueProp,
    defaultProp: defaultValue ?? '',
    onChange,
  });

  const text = value ?? '';
  const canSubmit = !disabled && text.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(text.trim());
    setValue('');
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <div
      data-slot="chat-input"
      className={cn('bg-card flex items-end gap-2 rounded-2xl border p-2 pl-1', className)}
    >
      <Textarea
        value={text}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        rows={1}
        className="max-h-40 min-h-9 resize-none overflow-y-auto border-0 bg-transparent p-2 shadow-none focus-visible:ring-0"
      />
      <Button
        type="button"
        size="icon"
        variant={canSubmit ? 'default' : 'secondary'}
        disabled={!canSubmit}
        onClick={submit}
        aria-label="Send message"
        className={disabled ? 'bg-neutral-300 text-neutral-500 disabled:opacity-100' : undefined}
      >
        <Send />
      </Button>
    </div>
  );
}

export { ChatInput };
