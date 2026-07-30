import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface DatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  minDate?: Date;
  placeholder?: string;
}

export default function DatePicker({
  selected,
  onChange,
  minDate,
  placeholder,
}: DatePickerProps) {
  return (
    <ReactDatePicker
      selected={selected}
      onChange={onChange}
      minDate={minDate}
      placeholderText={placeholder}
      dateFormat="MMM d, yyyy"
      className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary w-full"
    />
  );
}
