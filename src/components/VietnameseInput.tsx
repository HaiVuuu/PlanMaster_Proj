import React, { useState, useEffect, ChangeEvent, CompositionEvent } from 'react';

type InputProps = React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
type TextAreaProps = React.DetailedHTMLProps<React.TextareaHTMLAttributes<HTMLTextAreaElement>, HTMLTextAreaElement>;

type VietnameseInputProps = (InputProps | TextAreaProps) & {
  as?: 'input' | 'textarea';
};

/**
 * Một component Input/Textarea tùy chỉnh để xử lý đúng việc nhập liệu tiếng Việt (và các ngôn ngữ IME khác).
 * Nó sử dụng composition events để tránh việc cập nhật state khi người dùng đang gõ dấu.
 */
const VietnameseInput: React.FC<VietnameseInputProps> = ({ value: propValue, onChange, as = 'input', className, ...props }) => {
  const [isComposing, setIsComposing] = useState(false);
  const [internalValue, setInternalValue] = useState(propValue);

  // Cập nhật giá trị nội bộ khi prop `value` thay đổi từ bên ngoài
  useEffect(() => {
    if (propValue !== internalValue && !isComposing) {
      setInternalValue(propValue);
    }
  }, [propValue, isComposing, internalValue]);

  const handleComposition = (e: CompositionEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.type === 'compositionend') {
      setIsComposing(false);
      // Lệnh gọi `onChange` ở đây là thừa. Theo tiêu chuẩn của trình duyệt,
      // một sự kiện `input` (React ánh xạ thành `onChange`) cuối cùng sẽ được kích hoạt sau `compositionend`.
      // Hàm `handleChange` của chúng ta sẽ xử lý chính xác sự kiện đó vì `isComposing` đã là false.
      // Việc xóa lệnh gọi này sẽ khắc phục lỗi gọi hàm 2 lần mà bài test đã phát hiện.
    } else {
      setIsComposing(true);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Luôn cập nhật giá trị hiển thị ngay lập tức
    setInternalValue(e.target.value);
    // Chỉ kích hoạt `onChange` để cập nhật state của cha khi không gõ dấu
    if (!isComposing && onChange) {
      onChange(e as any);
    }
  };

  const commonProps = {
    value: internalValue ?? '', // Ensure value is not undefined/null to avoid React warnings
    onChange: handleChange,
    onCompositionStart: handleComposition,
    onCompositionUpdate: handleComposition,
    onCompositionEnd: handleComposition,
  };

  // Vấn đề: @tailwindcss/forms plugin thêm một viền mặc định cho tất cả input/textarea.
  // Ở những nơi cần input "inline" (như trong bảng TaskList), viền này không mong muốn.
  // Giải pháp: Thêm `border-transparent` làm mặc định. Các form khác đã có class `border`
  // hoặc `border-gray-300` sẽ ghi đè lên style này, nên sẽ không bị ảnh hưởng.
  // Thêm hiệu ứng focus để người dùng biết đang chỉnh sửa ô nào.
  const finalClassName = `bg-transparent focus:bg-white dark:focus:bg-gray-700 focus:border-gray-300 dark:focus:border-gray-600 rounded-md transition-colors duration-150 ${className || ''}`;

  if (as === 'textarea') {
    // The `as` prop ensures that the rest of the props match TextAreaProps
    return <textarea {...props as TextAreaProps} {...commonProps} className={finalClassName} />;
  }

  // Default to input
  return <input {...props as InputProps} {...commonProps} className={finalClassName} />;
};

export default VietnameseInput;