"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Popular countries with their dial codes and formatting
const countries = [
  { code: "ZA", name: "South Africa", dial: "+27", flag: "🇿🇦", format: "XXX XXX XXXX" },
  { code: "US", name: "United States", dial: "+1", flag: "🇺🇸", format: "(XXX) XXX-XXXX" },
  { code: "GB", name: "United Kingdom", dial: "+44", flag: "🇬🇧", format: "XXXX XXX XXXX" },
  { code: "AU", name: "Australia", dial: "+61", flag: "🇦🇺", format: "XXX XXX XXX" },
  { code: "CA", name: "Canada", dial: "+1", flag: "🇨🇦", format: "(XXX) XXX-XXXX" },
  { code: "IN", name: "India", dial: "+91", flag: "🇮🇳", format: "XXXXX XXXXX" },
  { code: "DE", name: "Germany", dial: "+49", flag: "🇩🇪", format: "XXX XXXXXXX" },
  { code: "FR", name: "France", dial: "+33", flag: "🇫🇷", format: "X XX XX XX XX" },
  { code: "IT", name: "Italy", dial: "+39", flag: "🇮🇹", format: "XXX XXX XXXX" },
  { code: "ES", name: "Spain", dial: "+34", flag: "🇪🇸", format: "XXX XX XX XX" },
  { code: "BR", name: "Brazil", dial: "+55", flag: "🇧🇷", format: "(XX) XXXXX-XXXX" },
  { code: "MX", name: "Mexico", dial: "+52", flag: "🇲🇽", format: "XXX XXX XXXX" },
  { code: "AR", name: "Argentina", dial: "+54", flag: "🇦🇷", format: "XX XXXX-XXXX" },
  { code: "CN", name: "China", dial: "+86", flag: "🇨🇳", format: "XXX XXXX XXXX" },
  { code: "JP", name: "Japan", dial: "+81", flag: "🇯🇵", format: "XX-XXXX-XXXX" },
  { code: "KR", name: "South Korea", dial: "+82", flag: "🇰🇷", format: "XX-XXXX-XXXX" },
  { code: "SG", name: "Singapore", dial: "+65", flag: "🇸🇬", format: "XXXX XXXX" },
  { code: "NZ", name: "New Zealand", dial: "+64", flag: "🇳🇿", format: "XX XXX XXXX" },
  { code: "NL", name: "Netherlands", dial: "+31", flag: "🇳🇱", format: "X XX XX XX XX" },
  { code: "BE", name: "Belgium", dial: "+32", flag: "🇧🇪", format: "XXX XX XX XX" },
];

export interface PhoneInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  defaultCountry?: string;
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = "", onChange, defaultCountry = "ZA", ...props }, ref) => {
    const [selectedCountry, setSelectedCountry] = React.useState(
      countries.find(c => c.code === defaultCountry) || countries[0]
    );
    const [phoneNumber, setPhoneNumber] = React.useState("");

    // Parse initial value if provided
    React.useEffect(() => {
      if (value && value.startsWith("+")) {
        // Find matching country by dial code
        const matchedCountry = countries.find(c => value.startsWith(c.dial));
        if (matchedCountry) {
          setSelectedCountry(matchedCountry);
          setPhoneNumber(value.substring(matchedCountry.dial.length));
        }
      }
    }, []);

    // Format phone number based on country pattern
    const formatPhoneNumber = (input: string, format: string) => {
      // Remove all non-digits
      const digits = input.replace(/\D/g, "");
      let formatted = "";
      let digitIndex = 0;

      for (let i = 0; i < format.length && digitIndex < digits.length; i++) {
        if (format[i] === "X") {
          formatted += digits[digitIndex];
          digitIndex++;
        } else {
          formatted += format[i];
        }
      }

      return formatted;
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;
      const formatted = formatPhoneNumber(input, selectedCountry.format);
      setPhoneNumber(formatted);

      // Combine country dial code with phone number
      const fullNumber = selectedCountry.dial + formatted.replace(/\D/g, "");
      onChange?.(fullNumber);
    };

    const handleCountryChange = (countryCode: string) => {
      const country = countries.find(c => c.code === countryCode);
      if (country) {
        setSelectedCountry(country);
        // Reformat existing number with new country format
        const formatted = formatPhoneNumber(phoneNumber, country.format);
        setPhoneNumber(formatted);
        const fullNumber = country.dial + formatted.replace(/\D/g, "");
        onChange?.(fullNumber);
      }
    };

    return (
      <div className={cn("flex gap-2", className)}>
        <Select value={selectedCountry.code} onValueChange={handleCountryChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue>
              <span className="flex items-center gap-2">
                <span className="text-lg">{selectedCountry.flag}</span>
                <span>{selectedCountry.dial}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                <span className="flex items-center gap-2">
                  <span className="text-lg">{country.flag}</span>
                  <span>{country.name}</span>
                  <span className="text-muted-foreground">{country.dial}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          ref={ref}
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneChange}
          placeholder={selectedCountry.format.replace(/X/g, "0")}
          {...props}
        />
      </div>
    );
  }
);

PhoneInput.displayName = "PhoneInput";
