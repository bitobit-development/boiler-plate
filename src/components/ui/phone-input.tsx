"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Country {
  name: string;
  code: string;
  flag: string;
  pattern?: string;
}

// Countries array sorted with longer/more specific codes first to handle
// duplicate dial codes correctly (e.g., +1 for US/Canada/Caribbean)
const COUNTRIES: Country[] = [
  { name: "Afghanistan", code: "+93", flag: "🇦🇫" },
  { name: "Albania", code: "+355", flag: "🇦🇱" },
  { name: "Algeria", code: "+213", flag: "🇩🇿" },
  { name: "Andorra", code: "+376", flag: "🇦🇩" },
  { name: "Angola", code: "+244", flag: "🇦🇴" },
  { name: "Argentina", code: "+54", flag: "🇦🇷", pattern: "XXX XXX-XXXX" },
  { name: "Armenia", code: "+374", flag: "🇦🇲" },
  { name: "Australia", code: "+61", flag: "🇦🇺", pattern: "XXX XXX XXX" },
  { name: "Austria", code: "+43", flag: "🇦🇹" },
  { name: "Azerbaijan", code: "+994", flag: "🇦🇿" },
  // NANP countries with specific area codes come BEFORE generic +1
  { name: "Bahamas", code: "+1242", flag: "🇧🇸" },
  { name: "Bahrain", code: "+973", flag: "🇧🇭" },
  { name: "Bangladesh", code: "+880", flag: "🇧🇩" },
  { name: "Barbados", code: "+1246", flag: "🇧🇧" },
  { name: "Belarus", code: "+375", flag: "🇧🇾" },
  { name: "Belgium", code: "+32", flag: "🇧🇪", pattern: "XXX XX XX XX" },
  { name: "Belize", code: "+501", flag: "🇧🇿" },
  { name: "Benin", code: "+229", flag: "🇧🇯" },
  { name: "Bhutan", code: "+975", flag: "🇧🇹" },
  { name: "Bolivia", code: "+591", flag: "🇧🇴" },
  { name: "Bosnia and Herzegovina", code: "+387", flag: "🇧🇦" },
  { name: "Botswana", code: "+267", flag: "🇧🇼" },
  { name: "Brazil", code: "+55", flag: "🇧🇷", pattern: "(XX) XXXXX-XXXX" },
  { name: "Brunei", code: "+673", flag: "🇧🇳" },
  { name: "Bulgaria", code: "+359", flag: "🇧🇬" },
  { name: "Burkina Faso", code: "+226", flag: "🇧🇫" },
  { name: "Burundi", code: "+257", flag: "🇧🇮" },
  { name: "Cambodia", code: "+855", flag: "🇰🇭" },
  { name: "Cameroon", code: "+237", flag: "🇨🇲" },
  { name: "Cape Verde", code: "+238", flag: "🇨🇻" },
  { name: "Central African Republic", code: "+236", flag: "🇨🇫" },
  { name: "Chad", code: "+235", flag: "🇹🇩" },
  { name: "Chile", code: "+56", flag: "🇨🇱" },
  { name: "China", code: "+86", flag: "🇨🇳", pattern: "XXX XXXX XXXX" },
  { name: "Colombia", code: "+57", flag: "🇨🇴" },
  { name: "Comoros", code: "+269", flag: "🇰🇲" },
  { name: "Congo", code: "+242", flag: "🇨🇬" },
  { name: "Costa Rica", code: "+506", flag: "🇨🇷" },
  { name: "Croatia", code: "+385", flag: "🇭🇷" },
  { name: "Cuba", code: "+53", flag: "🇨🇺" },
  { name: "Cyprus", code: "+357", flag: "🇨🇾" },
  { name: "Czech Republic", code: "+420", flag: "🇨🇿" },
  { name: "Denmark", code: "+45", flag: "🇩🇰" },
  { name: "Djibouti", code: "+253", flag: "🇩🇯" },
  // More NANP countries with specific area codes
  { name: "Dominica", code: "+1767", flag: "🇩🇲" },
  { name: "Dominican Republic", code: "+1809", flag: "🇩🇴" },
  { name: "Ecuador", code: "+593", flag: "🇪🇨" },
  { name: "Egypt", code: "+20", flag: "🇪🇬" },
  { name: "El Salvador", code: "+503", flag: "🇸🇻" },
  { name: "Equatorial Guinea", code: "+240", flag: "🇬🇶" },
  { name: "Eritrea", code: "+291", flag: "🇪🇷" },
  { name: "Estonia", code: "+372", flag: "🇪🇪" },
  { name: "Eswatini", code: "+268", flag: "🇸🇿", pattern: "XXXX XXXX" },
  { name: "Ethiopia", code: "+251", flag: "🇪🇹" },
  { name: "Fiji", code: "+679", flag: "🇫🇯" },
  { name: "Finland", code: "+358", flag: "🇫🇮" },
  { name: "France", code: "+33", flag: "🇫🇷", pattern: "X XX XX XX XX" },
  { name: "Gabon", code: "+241", flag: "🇬🇦" },
  { name: "Gambia", code: "+220", flag: "🇬🇲" },
  { name: "Georgia", code: "+995", flag: "🇬🇪" },
  { name: "Germany", code: "+49", flag: "🇩🇪", pattern: "XXX XXXXXXX" },
  { name: "Ghana", code: "+233", flag: "🇬🇭" },
  { name: "Greece", code: "+30", flag: "🇬🇷" },
  // More NANP countries with specific area codes
  { name: "Grenada", code: "+1473", flag: "🇬🇩" },
  { name: "Guatemala", code: "+502", flag: "🇬🇹" },
  { name: "Guinea", code: "+224", flag: "🇬🇳" },
  { name: "Guinea-Bissau", code: "+245", flag: "🇬🇼" },
  { name: "Guyana", code: "+592", flag: "🇬🇾" },
  { name: "Haiti", code: "+509", flag: "🇭🇹" },
  { name: "Honduras", code: "+504", flag: "🇭🇳" },
  { name: "Hong Kong", code: "+852", flag: "🇭🇰" },
  { name: "Hungary", code: "+36", flag: "🇭🇺" },
  { name: "Iceland", code: "+354", flag: "🇮🇸" },
  { name: "India", code: "+91", flag: "🇮🇳", pattern: "XXXXX XXXXX" },
  { name: "Indonesia", code: "+62", flag: "🇮🇩" },
  { name: "Iran", code: "+98", flag: "🇮🇷" },
  { name: "Iraq", code: "+964", flag: "🇮🇶" },
  { name: "Ireland", code: "+353", flag: "🇮🇪" },
  { name: "Israel", code: "+972", flag: "🇮🇱" },
  { name: "Italy", code: "+39", flag: "🇮🇹", pattern: "XXX XXX XXXX" },
  // More NANP countries with specific area codes
  { name: "Jamaica", code: "+1876", flag: "🇯🇲" },
  { name: "Japan", code: "+81", flag: "🇯🇵", pattern: "XX-XXXX-XXXX" },
  { name: "Jordan", code: "+962", flag: "🇯🇴" },
  { name: "Kenya", code: "+254", flag: "🇰🇪" },
  { name: "Kiribati", code: "+686", flag: "🇰🇮" },
  { name: "Kuwait", code: "+965", flag: "🇰🇼" },
  { name: "Kyrgyzstan", code: "+996", flag: "🇰🇬" },
  { name: "Laos", code: "+856", flag: "🇱🇦" },
  { name: "Latvia", code: "+371", flag: "🇱🇻" },
  { name: "Lebanon", code: "+961", flag: "🇱🇧" },
  { name: "Lesotho", code: "+266", flag: "🇱🇸" },
  { name: "Liberia", code: "+231", flag: "🇱🇷" },
  { name: "Libya", code: "+218", flag: "🇱🇾" },
  { name: "Liechtenstein", code: "+423", flag: "🇱🇮" },
  { name: "Lithuania", code: "+370", flag: "🇱🇹" },
  { name: "Luxembourg", code: "+352", flag: "🇱🇺" },
  { name: "Madagascar", code: "+261", flag: "🇲🇬" },
  { name: "Malawi", code: "+265", flag: "🇲🇼" },
  { name: "Malaysia", code: "+60", flag: "🇲🇾" },
  { name: "Maldives", code: "+960", flag: "🇲🇻" },
  { name: "Mali", code: "+223", flag: "🇲🇱" },
  { name: "Malta", code: "+356", flag: "🇲🇹" },
  { name: "Marshall Islands", code: "+692", flag: "🇲🇭" },
  { name: "Mauritania", code: "+222", flag: "🇲🇷" },
  { name: "Mauritius", code: "+230", flag: "🇲🇺" },
  { name: "Mexico", code: "+52", flag: "🇲🇽", pattern: "XXX XXX XXXX" },
  { name: "Micronesia", code: "+691", flag: "🇫🇲" },
  { name: "Moldova", code: "+373", flag: "🇲🇩" },
  { name: "Monaco", code: "+377", flag: "🇲🇨" },
  { name: "Mongolia", code: "+976", flag: "🇲🇳" },
  { name: "Montenegro", code: "+382", flag: "🇲🇪" },
  { name: "Morocco", code: "+212", flag: "🇲🇦" },
  { name: "Mozambique", code: "+258", flag: "🇲🇿" },
  { name: "Myanmar", code: "+95", flag: "🇲🇲" },
  { name: "Namibia", code: "+264", flag: "🇳🇦" },
  { name: "Nauru", code: "+674", flag: "🇳🇷" },
  { name: "Nepal", code: "+977", flag: "🇳🇵" },
  { name: "Netherlands", code: "+31", flag: "🇳🇱", pattern: "X XX XX XX XX" },
  { name: "New Zealand", code: "+64", flag: "🇳🇿", pattern: "XX XXX XXXX" },
  { name: "Nicaragua", code: "+505", flag: "🇳🇮" },
  { name: "Niger", code: "+227", flag: "🇳🇪" },
  { name: "Nigeria", code: "+234", flag: "🇳🇬" },
  { name: "North Korea", code: "+850", flag: "🇰🇵" },
  { name: "North Macedonia", code: "+389", flag: "🇲🇰" },
  { name: "Norway", code: "+47", flag: "🇳🇴" },
  { name: "Oman", code: "+968", flag: "🇴🇲" },
  { name: "Pakistan", code: "+92", flag: "🇵🇰" },
  { name: "Palau", code: "+680", flag: "🇵🇼" },
  { name: "Palestine", code: "+970", flag: "🇵🇸" },
  { name: "Panama", code: "+507", flag: "🇵🇦" },
  { name: "Papua New Guinea", code: "+675", flag: "🇵🇬" },
  { name: "Paraguay", code: "+595", flag: "🇵🇾" },
  { name: "Peru", code: "+51", flag: "🇵🇪" },
  { name: "Philippines", code: "+63", flag: "🇵🇭" },
  { name: "Poland", code: "+48", flag: "🇵🇱" },
  { name: "Portugal", code: "+351", flag: "🇵🇹" },
  { name: "Qatar", code: "+974", flag: "🇶🇦" },
  { name: "Romania", code: "+40", flag: "🇷🇴" },
  { name: "Rwanda", code: "+250", flag: "🇷🇼" },
  // More NANP countries with specific area codes
  { name: "Saint Kitts and Nevis", code: "+1869", flag: "🇰🇳" },
  { name: "Saint Lucia", code: "+1758", flag: "🇱🇨" },
  { name: "Saint Vincent and the Grenadines", code: "+1784", flag: "🇻🇨" },
  { name: "Samoa", code: "+685", flag: "🇼🇸" },
  { name: "San Marino", code: "+378", flag: "🇸🇲" },
  { name: "Sao Tome and Principe", code: "+239", flag: "🇸🇹" },
  { name: "Saudi Arabia", code: "+966", flag: "🇸🇦" },
  { name: "Senegal", code: "+221", flag: "🇸🇳" },
  { name: "Serbia", code: "+381", flag: "🇷🇸" },
  { name: "Seychelles", code: "+248", flag: "🇸🇨" },
  { name: "Sierra Leone", code: "+232", flag: "🇸🇱" },
  { name: "Singapore", code: "+65", flag: "🇸🇬", pattern: "XXXX XXXX" },
  { name: "Slovakia", code: "+421", flag: "🇸🇰" },
  { name: "Slovenia", code: "+386", flag: "🇸🇮" },
  { name: "Solomon Islands", code: "+677", flag: "🇸🇧" },
  { name: "Somalia", code: "+252", flag: "🇸🇴" },
  { name: "South Africa", code: "+27", flag: "🇿🇦", pattern: "XXX XXX XXXX" },
  { name: "South Korea", code: "+82", flag: "🇰🇷", pattern: "XX-XXXX-XXXX" },
  { name: "South Sudan", code: "+211", flag: "🇸🇸" },
  { name: "Spain", code: "+34", flag: "🇪🇸", pattern: "XXX XX XX XX" },
  { name: "Sri Lanka", code: "+94", flag: "🇱🇰" },
  { name: "Sudan", code: "+249", flag: "🇸🇩" },
  { name: "Suriname", code: "+597", flag: "🇸🇷" },
  { name: "Sweden", code: "+46", flag: "🇸🇪" },
  { name: "Switzerland", code: "+41", flag: "🇨🇭" },
  { name: "Syria", code: "+963", flag: "🇸🇾" },
  { name: "Taiwan", code: "+886", flag: "🇹🇼" },
  { name: "Tajikistan", code: "+992", flag: "🇹🇯" },
  { name: "Tanzania", code: "+255", flag: "🇹🇿" },
  { name: "Thailand", code: "+66", flag: "🇹🇭" },
  { name: "Timor-Leste", code: "+670", flag: "🇹🇱" },
  { name: "Togo", code: "+228", flag: "🇹🇬" },
  { name: "Tonga", code: "+676", flag: "🇹🇴" },
  // More NANP countries with specific area codes
  { name: "Trinidad and Tobago", code: "+1868", flag: "🇹🇹" },
  { name: "Tunisia", code: "+216", flag: "🇹🇳" },
  { name: "Turkey", code: "+90", flag: "🇹🇷" },
  { name: "Turkmenistan", code: "+993", flag: "🇹🇲" },
  { name: "Tuvalu", code: "+688", flag: "🇹🇻" },
  { name: "Uganda", code: "+256", flag: "🇺🇬" },
  { name: "Ukraine", code: "+380", flag: "🇺🇦" },
  { name: "United Arab Emirates", code: "+971", flag: "🇦🇪" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧", pattern: "XXXX XXX XXXX" },
  { name: "Uruguay", code: "+598", flag: "🇺🇾" },
  { name: "Uzbekistan", code: "+998", flag: "🇺🇿" },
  { name: "Vanuatu", code: "+678", flag: "🇻🇺" },
  { name: "Vatican City", code: "+379", flag: "🇻🇦" },
  { name: "Venezuela", code: "+58", flag: "🇻🇪" },
  { name: "Vietnam", code: "+84", flag: "🇻🇳" },
  { name: "Yemen", code: "+967", flag: "🇾🇪" },
  { name: "Zambia", code: "+260", flag: "🇿🇲" },
  { name: "Zimbabwe", code: "+263", flag: "🇿🇼" },
  // Generic +1 countries (US/Canada) come AFTER all specific +1xxx codes
  { name: "United States", code: "+1", flag: "🇺🇸", pattern: "(XXX) XXX-XXXX" },
  { name: "Canada", code: "+1", flag: "🇨🇦", pattern: "(XXX) XXX-XXXX" },
  // Russia comes before Kazakhstan as it's more common for +7
  { name: "Russia", code: "+7", flag: "🇷🇺" },
  { name: "Kazakhstan", code: "+7", flag: "🇰🇿" },
];

// Popular countries for quick access
// These are commonly used countries that appear at the top of the selector
const POPULAR_COUNTRIES: Country[] = [
  { name: "United States", code: "+1", flag: "🇺🇸", pattern: "(XXX) XXX-XXXX" },
  { name: "United Kingdom", code: "+44", flag: "🇬🇧", pattern: "XXXX XXX XXX" },
  { name: "Canada", code: "+1", flag: "🇨🇦", pattern: "(XXX) XXX-XXXX" },
  { name: "Australia", code: "+61", flag: "🇦🇺", pattern: "XXX XXX XXX" },
  { name: "South Africa", code: "+27", flag: "🇿🇦", pattern: "XX XXX XXXX" },
  { name: "Israel", code: "+972", flag: "🇮🇱", pattern: "XX-XXX-XXXX" },
  { name: "Germany", code: "+49", flag: "🇩🇪", pattern: "XXX XXXXXXX" },
  { name: "France", code: "+33", flag: "🇫🇷", pattern: "X XX XX XX XX" },
];

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  error?: boolean;
  disabled?: boolean;
}

export function PhoneInput({
  value = "",
  onChange,
  className,
  error = false,
  disabled = false,
}: PhoneInputProps) {
  const [open, setOpen] = React.useState(false);
  const [selectedCountry, setSelectedCountry] = React.useState<Country>(
    COUNTRIES.find((c) => c.name === "South Africa") || COUNTRIES[0]
  );
  const [phoneNumber, setPhoneNumber] = React.useState("");

  // Parse initial value
  React.useEffect(() => {
    if (value && value.startsWith("+")) {
      // Find the country by matching the country code
      const matchedCountry = COUNTRIES.find((country) =>
        value.startsWith(country.code)
      );
      if (matchedCountry) {
        setSelectedCountry(matchedCountry);
        setPhoneNumber(value.slice(matchedCountry.code.length));
      }
    }
  }, [value]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let input = e.target.value;

    // Handle country code detection if user types +
    if (input.startsWith("+")) {
      // Try to find a matching country code (including partial matches)
      const matchedCountry = COUNTRIES.find((country) =>
        input.startsWith(country.code)
      );
      if (matchedCountry && matchedCountry.code !== selectedCountry.code) {
        setSelectedCountry(matchedCountry);
        setPhoneNumber(input.slice(matchedCountry.code.length));
        onChange?.(input.replace(/\s/g, ""));
        return;
      }

      // Preserve the "+" for partial country code entry
      // Only clean digits after the +, keeping the + prefix
      const digitsAfterPlus = input.slice(1).replace(/[^\d]/g, "");
      const cleanedWithPlus = `+${digitsAfterPlus}`;
      setPhoneNumber(cleanedWithPlus);
      onChange?.(cleanedWithPlus);
      return;
    }

    // Handle local numbers starting with 0 (auto-convert to country code)
    // Many countries use 0 for local dialing which should be removed for international format
    // Including: Israel (+972), South Africa (+27), UK (+44), and many others
    if (input.startsWith("0")) {
      // List of country codes where leading 0 should be removed
      const countriesWithLeadingZero = [
        "+27",  // South Africa
        "+972", // Israel
        "+44",  // United Kingdom
        "+33",  // France
        "+39",  // Italy
        "+49",  // Germany
        "+31",  // Netherlands
        "+32",  // Belgium
        "+41",  // Switzerland
        "+43",  // Austria
        "+81",  // Japan
        "+82",  // South Korea
        "+61",  // Australia
        "+64",  // New Zealand
      ];

      if (countriesWithLeadingZero.includes(selectedCountry.code)) {
        input = input.slice(1);
      }
    }

    // Clean input - remove all non-digits for regular phone numbers
    const cleaned = input.replace(/[^\d]/g, "");
    setPhoneNumber(cleaned);

    // Build the full international number
    const fullNumber = `${selectedCountry.code}${cleaned}`;
    onChange?.(fullNumber);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setOpen(false);

    // Update the full number with new country code
    const fullNumber = `${country.code}${phoneNumber}`;
    onChange?.(fullNumber);
  };

  return (
    <div className={cn("flex flex-col sm:flex-row gap-2 w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full sm:w-[40%] justify-between bg-gray-800 border-gray-700 text-white hover:bg-gray-700 hover:text-white",
              "h-[50px]", // Match the height of input fields with py-3
              error && "border-red-500"
            )}
          >
            <span className="flex items-center gap-2">
              <span className="text-xl">{selectedCountry.flag}</span>
              <span className="text-sm">{selectedCountry.code}</span>
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0 bg-gray-800 border-gray-700">
          <Command className="bg-gray-800">
            <CommandInput
              placeholder="Search country..."
              className="text-white"
            />
            <CommandList>
              <CommandEmpty className="text-gray-400 py-6 text-center text-sm">
                No country found.
              </CommandEmpty>

              {/* Popular Countries Section */}
              <CommandGroup heading="Popular">
                {POPULAR_COUNTRIES.map((country) => (
                  <CommandItem
                    key={`popular-${country.code}-${country.name}`}
                    value={`${country.name} ${country.code}`}
                    onSelect={() => {
                      handleCountrySelect(country);
                    }}
                    onClick={() => {
                      handleCountrySelect(country);
                    }}
                    className="text-white hover:bg-gray-700 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCountry.name === country.name
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="text-xl mr-2">{country.flag}</span>
                    <span className="flex-1">{country.name}</span>
                    <span className="text-gray-400 text-sm">
                      {country.code}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>

              <CommandSeparator className="bg-gray-700" />

              {/* All Countries Section */}
              <CommandGroup heading="All Countries">
                {COUNTRIES.map((country) => (
                  <CommandItem
                    key={country.code + country.name}
                    value={`${country.name} ${country.code}`}
                    onSelect={() => {
                      handleCountrySelect(country);
                    }}
                    onClick={() => {
                      handleCountrySelect(country);
                    }}
                    className="text-white hover:bg-gray-700 cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedCountry.name === country.name
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="text-xl mr-2">{country.flag}</span>
                    <span className="flex-1">{country.name}</span>
                    <span className="text-gray-400 text-sm">
                      {country.code}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <input
        type="tel"
        value={phoneNumber}
        onChange={handlePhoneChange}
        disabled={disabled}
        placeholder={
          selectedCountry.pattern || "Enter phone number"
        }
        className={cn(
          "w-full sm:flex-1 px-4 py-3 bg-gray-800 text-white border border-gray-700 rounded-lg",
          "focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/50",
          "transition-all duration-200",
          error && "border-red-500 focus:border-red-500 focus:ring-red-500/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        aria-label="Phone number"
      />
    </div>
  );
}
