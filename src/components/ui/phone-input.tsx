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

// Comprehensive country data with flags and formatting patterns
const COUNTRIES = [
  { code: "1", flag: "🇺🇸", name: "United States", pattern: "(###) ###-####", maxLength: 10 },
  { code: "1", flag: "🇨🇦", name: "Canada", pattern: "(###) ###-####", maxLength: 10 },
  { code: "7", flag: "🇷🇺", name: "Russia", pattern: "### ###-##-##", maxLength: 10 },
  { code: "20", flag: "🇪🇬", name: "Egypt", pattern: "### ### ####", maxLength: 10 },
  { code: "27", flag: "🇿🇦", name: "South Africa", pattern: "## ### ####", maxLength: 9 },
  { code: "30", flag: "🇬🇷", name: "Greece", pattern: "### ### ####", maxLength: 10 },
  { code: "31", flag: "🇳🇱", name: "Netherlands", pattern: "## ### ####", maxLength: 9 },
  { code: "32", flag: "🇧🇪", name: "Belgium", pattern: "### ## ## ##", maxLength: 9 },
  { code: "33", flag: "🇫🇷", name: "France", pattern: "# ## ## ## ##", maxLength: 9 },
  { code: "34", flag: "🇪🇸", name: "Spain", pattern: "### ### ###", maxLength: 9 },
  { code: "36", flag: "🇭🇺", name: "Hungary", pattern: "## ### ###", maxLength: 9 },
  { code: "39", flag: "🇮🇹", name: "Italy", pattern: "### ### ####", maxLength: 10 },
  { code: "40", flag: "🇷🇴", name: "Romania", pattern: "### ### ###", maxLength: 9 },
  { code: "41", flag: "🇨🇭", name: "Switzerland", pattern: "## ### ## ##", maxLength: 9 },
  { code: "43", flag: "🇦🇹", name: "Austria", pattern: "### ######", maxLength: 10 },
  { code: "44", flag: "🇬🇧", name: "United Kingdom", pattern: "#### ######", maxLength: 10 },
  { code: "45", flag: "🇩🇰", name: "Denmark", pattern: "## ## ## ##", maxLength: 8 },
  { code: "46", flag: "🇸🇪", name: "Sweden", pattern: "##-### ## ##", maxLength: 9 },
  { code: "47", flag: "🇳🇴", name: "Norway", pattern: "### ## ###", maxLength: 8 },
  { code: "48", flag: "🇵🇱", name: "Poland", pattern: "### ### ###", maxLength: 9 },
  { code: "49", flag: "🇩🇪", name: "Germany", pattern: "### ########", maxLength: 11 },
  { code: "51", flag: "🇵🇪", name: "Peru", pattern: "### ### ###", maxLength: 9 },
  { code: "52", flag: "🇲🇽", name: "Mexico", pattern: "### ### ####", maxLength: 10 },
  { code: "53", flag: "🇨🇺", name: "Cuba", pattern: "# ### ####", maxLength: 8 },
  { code: "54", flag: "🇦🇷", name: "Argentina", pattern: "### ###-####", maxLength: 10 },
  { code: "55", flag: "🇧🇷", name: "Brazil", pattern: "## #####-####", maxLength: 11 },
  { code: "56", flag: "🇨🇱", name: "Chile", pattern: "# #### ####", maxLength: 9 },
  { code: "57", flag: "🇨🇴", name: "Colombia", pattern: "### ### ####", maxLength: 10 },
  { code: "58", flag: "🇻🇪", name: "Venezuela", pattern: "###-#######", maxLength: 10 },
  { code: "60", flag: "🇲🇾", name: "Malaysia", pattern: "##-### ####", maxLength: 9 },
  { code: "61", flag: "🇦🇺", name: "Australia", pattern: "### ### ###", maxLength: 9 },
  { code: "62", flag: "🇮🇩", name: "Indonesia", pattern: "###-###-####", maxLength: 11 },
  { code: "63", flag: "🇵🇭", name: "Philippines", pattern: "### ### ####", maxLength: 10 },
  { code: "64", flag: "🇳🇿", name: "New Zealand", pattern: "##-### ####", maxLength: 9 },
  { code: "65", flag: "🇸🇬", name: "Singapore", pattern: "#### ####", maxLength: 8 },
  { code: "66", flag: "🇹🇭", name: "Thailand", pattern: "##-###-####", maxLength: 9 },
  { code: "81", flag: "🇯🇵", name: "Japan", pattern: "##-####-####", maxLength: 10 },
  { code: "82", flag: "🇰🇷", name: "South Korea", pattern: "##-####-####", maxLength: 10 },
  { code: "84", flag: "🇻🇳", name: "Vietnam", pattern: "### ### ####", maxLength: 10 },
  { code: "86", flag: "🇨🇳", name: "China", pattern: "### #### ####", maxLength: 11 },
  { code: "90", flag: "🇹🇷", name: "Turkey", pattern: "### ### ## ##", maxLength: 10 },
  { code: "91", flag: "🇮🇳", name: "India", pattern: "##### #####", maxLength: 10 },
  { code: "92", flag: "🇵🇰", name: "Pakistan", pattern: "### #######", maxLength: 10 },
  { code: "93", flag: "🇦🇫", name: "Afghanistan", pattern: "##-###-####", maxLength: 9 },
  { code: "94", flag: "🇱🇰", name: "Sri Lanka", pattern: "##-###-####", maxLength: 9 },
  { code: "95", flag: "🇲🇲", name: "Myanmar", pattern: "##-######", maxLength: 8 },
  { code: "98", flag: "🇮🇷", name: "Iran", pattern: "### ### ####", maxLength: 10 },
  { code: "212", flag: "🇲🇦", name: "Morocco", pattern: "##-####-###", maxLength: 9 },
  { code: "213", flag: "🇩🇿", name: "Algeria", pattern: "### ## ## ##", maxLength: 9 },
  { code: "216", flag: "🇹🇳", name: "Tunisia", pattern: "## ### ###", maxLength: 8 },
  { code: "218", flag: "🇱🇾", name: "Libya", pattern: "##-#######", maxLength: 9 },
  { code: "220", flag: "🇬🇲", name: "Gambia", pattern: "### ####", maxLength: 7 },
  { code: "221", flag: "🇸🇳", name: "Senegal", pattern: "## ### ## ##", maxLength: 9 },
  { code: "222", flag: "🇲🇷", name: "Mauritania", pattern: "## ## ## ##", maxLength: 8 },
  { code: "223", flag: "🇲🇱", name: "Mali", pattern: "## ## ## ##", maxLength: 8 },
  { code: "224", flag: "🇬🇳", name: "Guinea", pattern: "### ## ## ##", maxLength: 9 },
  { code: "225", flag: "🇨🇮", name: "Ivory Coast", pattern: "## ## ## ##", maxLength: 8 },
  { code: "226", flag: "🇧🇫", name: "Burkina Faso", pattern: "## ## ## ##", maxLength: 8 },
  { code: "227", flag: "🇳🇪", name: "Niger", pattern: "## ## ## ##", maxLength: 8 },
  { code: "228", flag: "🇹🇬", name: "Togo", pattern: "## ## ## ##", maxLength: 8 },
  { code: "229", flag: "🇧🇯", name: "Benin", pattern: "## ## ## ##", maxLength: 8 },
  { code: "230", flag: "🇲🇺", name: "Mauritius", pattern: "#### ####", maxLength: 8 },
  { code: "231", flag: "🇱🇷", name: "Liberia", pattern: "## ### ####", maxLength: 9 },
  { code: "232", flag: "🇸🇱", name: "Sierra Leone", pattern: "## ######", maxLength: 8 },
  { code: "233", flag: "🇬🇭", name: "Ghana", pattern: "## ### ####", maxLength: 9 },
  { code: "234", flag: "🇳🇬", name: "Nigeria", pattern: "### ### ####", maxLength: 10 },
  { code: "235", flag: "🇹🇩", name: "Chad", pattern: "## ## ## ##", maxLength: 8 },
  { code: "236", flag: "🇨🇫", name: "Central African Republic", pattern: "## ## ## ##", maxLength: 8 },
  { code: "237", flag: "🇨🇲", name: "Cameroon", pattern: "# ## ## ## ##", maxLength: 9 },
  { code: "238", flag: "🇨🇻", name: "Cape Verde", pattern: "### ## ##", maxLength: 7 },
  { code: "239", flag: "🇸🇹", name: "Sao Tome and Principe", pattern: "## #####", maxLength: 7 },
  { code: "240", flag: "🇬🇶", name: "Equatorial Guinea", pattern: "## ### ####", maxLength: 9 },
  { code: "241", flag: "🇬🇦", name: "Gabon", pattern: "# ## ## ##", maxLength: 8 },
  { code: "242", flag: "🇨🇬", name: "Congo", pattern: "## ### ####", maxLength: 9 },
  { code: "243", flag: "🇨🇩", name: "DR Congo", pattern: "### ### ###", maxLength: 9 },
  { code: "244", flag: "🇦🇴", name: "Angola", pattern: "### ### ###", maxLength: 9 },
  { code: "245", flag: "🇬🇼", name: "Guinea-Bissau", pattern: "## ######", maxLength: 8 },
  { code: "246", flag: "🇮🇴", name: "Diego Garcia", pattern: "### ####", maxLength: 7 },
  { code: "248", flag: "🇸🇨", name: "Seychelles", pattern: "# ### ###", maxLength: 7 },
  { code: "249", flag: "🇸🇩", name: "Sudan", pattern: "## ### ####", maxLength: 9 },
  { code: "250", flag: "🇷🇼", name: "Rwanda", pattern: "### ### ###", maxLength: 9 },
  { code: "251", flag: "🇪🇹", name: "Ethiopia", pattern: "## ### ####", maxLength: 9 },
  { code: "252", flag: "🇸🇴", name: "Somalia", pattern: "## ### ###", maxLength: 8 },
  { code: "253", flag: "🇩🇯", name: "Djibouti", pattern: "## ## ## ##", maxLength: 8 },
  { code: "254", flag: "🇰🇪", name: "Kenya", pattern: "### ######", maxLength: 9 },
  { code: "255", flag: "🇹🇿", name: "Tanzania", pattern: "### ### ###", maxLength: 9 },
  { code: "256", flag: "🇺🇬", name: "Uganda", pattern: "### ######", maxLength: 9 },
  { code: "257", flag: "🇧🇮", name: "Burundi", pattern: "## ## ## ##", maxLength: 8 },
  { code: "258", flag: "🇲🇿", name: "Mozambique", pattern: "## ### ####", maxLength: 9 },
  { code: "260", flag: "🇿🇲", name: "Zambia", pattern: "## ### ####", maxLength: 9 },
  { code: "261", flag: "🇲🇬", name: "Madagascar", pattern: "## ## ### ##", maxLength: 9 },
  { code: "262", flag: "🇷🇪", name: "Reunion", pattern: "### ## ## ##", maxLength: 9 },
  { code: "263", flag: "🇿🇼", name: "Zimbabwe", pattern: "## ### ####", maxLength: 9 },
  { code: "264", flag: "🇳🇦", name: "Namibia", pattern: "## ### ####", maxLength: 9 },
  { code: "265", flag: "🇲🇼", name: "Malawi", pattern: "# #### ####", maxLength: 9 },
  { code: "266", flag: "🇱🇸", name: "Lesotho", pattern: "# ### ####", maxLength: 8 },
  { code: "267", flag: "🇧🇼", name: "Botswana", pattern: "## ### ###", maxLength: 8 },
  { code: "268", flag: "🇸🇿", name: "Eswatini", pattern: "## ## ## ##", maxLength: 8 },
  { code: "269", flag: "🇰🇲", name: "Comoros", pattern: "## #####", maxLength: 7 },
  { code: "290", flag: "🇸🇭", name: "Saint Helena", pattern: "####", maxLength: 4 },
  { code: "291", flag: "🇪🇷", name: "Eritrea", pattern: "# ### ###", maxLength: 7 },
  { code: "297", flag: "🇦🇼", name: "Aruba", pattern: "### ####", maxLength: 7 },
  { code: "298", flag: "🇫🇴", name: "Faroe Islands", pattern: "######", maxLength: 6 },
  { code: "299", flag: "🇬🇱", name: "Greenland", pattern: "## ## ##", maxLength: 6 },
  { code: "350", flag: "🇬🇮", name: "Gibraltar", pattern: "### #####", maxLength: 8 },
  { code: "351", flag: "🇵🇹", name: "Portugal", pattern: "### ### ###", maxLength: 9 },
  { code: "352", flag: "🇱🇺", name: "Luxembourg", pattern: "### ### ###", maxLength: 9 },
  { code: "353", flag: "🇮🇪", name: "Ireland", pattern: "## ### ####", maxLength: 9 },
  { code: "354", flag: "🇮🇸", name: "Iceland", pattern: "### ####", maxLength: 7 },
  { code: "355", flag: "🇦🇱", name: "Albania", pattern: "## ### ####", maxLength: 9 },
  { code: "356", flag: "🇲🇹", name: "Malta", pattern: "#### ####", maxLength: 8 },
  { code: "357", flag: "🇨🇾", name: "Cyprus", pattern: "## ######", maxLength: 8 },
  { code: "358", flag: "🇫🇮", name: "Finland", pattern: "## ### ## ##", maxLength: 9 },
  { code: "359", flag: "🇧🇬", name: "Bulgaria", pattern: "## ### ###", maxLength: 9 },
  { code: "370", flag: "🇱🇹", name: "Lithuania", pattern: "### #####", maxLength: 8 },
  { code: "371", flag: "🇱🇻", name: "Latvia", pattern: "## ### ###", maxLength: 8 },
  { code: "372", flag: "🇪🇪", name: "Estonia", pattern: "#### ####", maxLength: 8 },
  { code: "373", flag: "🇲🇩", name: "Moldova", pattern: "### ## ###", maxLength: 8 },
  { code: "374", flag: "🇦🇲", name: "Armenia", pattern: "## ######", maxLength: 8 },
  { code: "375", flag: "🇧🇾", name: "Belarus", pattern: "## ###-##-##", maxLength: 9 },
  { code: "376", flag: "🇦🇩", name: "Andorra", pattern: "### ###", maxLength: 6 },
  { code: "377", flag: "🇲🇨", name: "Monaco", pattern: "## ## ## ## ##", maxLength: 9 },
  { code: "378", flag: "🇸🇲", name: "San Marino", pattern: "#### ######", maxLength: 10 },
  { code: "380", flag: "🇺🇦", name: "Ukraine", pattern: "## ### ## ##", maxLength: 9 },
  { code: "381", flag: "🇷🇸", name: "Serbia", pattern: "## ### ####", maxLength: 9 },
  { code: "382", flag: "🇲🇪", name: "Montenegro", pattern: "## ### ###", maxLength: 8 },
  { code: "383", flag: "🇽🇰", name: "Kosovo", pattern: "## ### ###", maxLength: 8 },
  { code: "385", flag: "🇭🇷", name: "Croatia", pattern: "## ### ####", maxLength: 9 },
  { code: "386", flag: "🇸🇮", name: "Slovenia", pattern: "## ### ###", maxLength: 8 },
  { code: "387", flag: "🇧🇦", name: "Bosnia and Herzegovina", pattern: "## ### ###", maxLength: 8 },
  { code: "389", flag: "🇲🇰", name: "North Macedonia", pattern: "## ### ###", maxLength: 8 },
  { code: "420", flag: "🇨🇿", name: "Czech Republic", pattern: "### ### ###", maxLength: 9 },
  { code: "421", flag: "🇸🇰", name: "Slovakia", pattern: "### ### ###", maxLength: 9 },
  { code: "423", flag: "🇱🇮", name: "Liechtenstein", pattern: "### ####", maxLength: 7 },
  { code: "500", flag: "🇫🇰", name: "Falkland Islands", pattern: "#####", maxLength: 5 },
  { code: "501", flag: "🇧🇿", name: "Belize", pattern: "###-####", maxLength: 7 },
  { code: "502", flag: "🇬🇹", name: "Guatemala", pattern: "#### ####", maxLength: 8 },
  { code: "503", flag: "🇸🇻", name: "El Salvador", pattern: "#### ####", maxLength: 8 },
  { code: "504", flag: "🇭🇳", name: "Honduras", pattern: "####-####", maxLength: 8 },
  { code: "505", flag: "🇳🇮", name: "Nicaragua", pattern: "#### ####", maxLength: 8 },
  { code: "506", flag: "🇨🇷", name: "Costa Rica", pattern: "#### ####", maxLength: 8 },
  { code: "507", flag: "🇵🇦", name: "Panama", pattern: "####-####", maxLength: 8 },
  { code: "508", flag: "🇵🇲", name: "Saint Pierre and Miquelon", pattern: "## ## ##", maxLength: 6 },
  { code: "509", flag: "🇭🇹", name: "Haiti", pattern: "## ## ####", maxLength: 8 },
  { code: "590", flag: "🇬🇵", name: "Guadeloupe", pattern: "### ## ## ##", maxLength: 9 },
  { code: "591", flag: "🇧🇴", name: "Bolivia", pattern: "# ### ####", maxLength: 8 },
  { code: "592", flag: "🇬🇾", name: "Guyana", pattern: "### ####", maxLength: 7 },
  { code: "593", flag: "🇪🇨", name: "Ecuador", pattern: "## ### ####", maxLength: 9 },
  { code: "594", flag: "🇬🇫", name: "French Guiana", pattern: "### ## ## ##", maxLength: 9 },
  { code: "595", flag: "🇵🇾", name: "Paraguay", pattern: "### ######", maxLength: 9 },
  { code: "596", flag: "🇲🇶", name: "Martinique", pattern: "### ## ## ##", maxLength: 9 },
  { code: "597", flag: "🇸🇷", name: "Suriname", pattern: "###-####", maxLength: 7 },
  { code: "598", flag: "🇺🇾", name: "Uruguay", pattern: "## ### ###", maxLength: 8 },
  { code: "599", flag: "🇨🇼", name: "Curacao", pattern: "# ### ####", maxLength: 8 },
  { code: "670", flag: "🇹🇱", name: "Timor-Leste", pattern: "### ####", maxLength: 7 },
  { code: "672", flag: "🇳🇫", name: "Norfolk Island", pattern: "### ###", maxLength: 6 },
  { code: "673", flag: "🇧🇳", name: "Brunei", pattern: "### ####", maxLength: 7 },
  { code: "674", flag: "🇳🇷", name: "Nauru", pattern: "### ####", maxLength: 7 },
  { code: "675", flag: "🇵🇬", name: "Papua New Guinea", pattern: "### ####", maxLength: 7 },
  { code: "676", flag: "🇹🇴", name: "Tonga", pattern: "#####", maxLength: 5 },
  { code: "677", flag: "🇸🇧", name: "Solomon Islands", pattern: "### ####", maxLength: 7 },
  { code: "678", flag: "🇻🇺", name: "Vanuatu", pattern: "## #####", maxLength: 7 },
  { code: "679", flag: "🇫🇯", name: "Fiji", pattern: "### ####", maxLength: 7 },
  { code: "680", flag: "🇵🇼", name: "Palau", pattern: "### ####", maxLength: 7 },
  { code: "681", flag: "🇼🇫", name: "Wallis and Futuna", pattern: "## ## ##", maxLength: 6 },
  { code: "682", flag: "🇨🇰", name: "Cook Islands", pattern: "## ###", maxLength: 5 },
  { code: "683", flag: "🇳🇺", name: "Niue", pattern: "####", maxLength: 4 },
  { code: "685", flag: "🇼🇸", name: "Samoa", pattern: "## ####", maxLength: 6 },
  { code: "686", flag: "🇰🇮", name: "Kiribati", pattern: "## ###", maxLength: 5 },
  { code: "687", flag: "🇳🇨", name: "New Caledonia", pattern: "## ## ##", maxLength: 6 },
  { code: "688", flag: "🇹🇻", name: "Tuvalu", pattern: "######", maxLength: 6 },
  { code: "689", flag: "🇵🇫", name: "French Polynesia", pattern: "## ## ##", maxLength: 6 },
  { code: "690", flag: "🇹🇰", name: "Tokelau", pattern: "####", maxLength: 4 },
  { code: "691", flag: "🇫🇲", name: "Micronesia", pattern: "### ####", maxLength: 7 },
  { code: "692", flag: "🇲🇭", name: "Marshall Islands", pattern: "###-####", maxLength: 7 },
  { code: "850", flag: "🇰🇵", name: "North Korea", pattern: "### ####", maxLength: 7 },
  { code: "852", flag: "🇭🇰", name: "Hong Kong", pattern: "#### ####", maxLength: 8 },
  { code: "853", flag: "🇲🇴", name: "Macau", pattern: "#### ####", maxLength: 8 },
  { code: "855", flag: "🇰🇭", name: "Cambodia", pattern: "## ### ###", maxLength: 8 },
  { code: "856", flag: "🇱🇦", name: "Laos", pattern: "## ### ###", maxLength: 8 },
  { code: "880", flag: "🇧🇩", name: "Bangladesh", pattern: "####-######", maxLength: 10 },
  { code: "886", flag: "🇹🇼", name: "Taiwan", pattern: "### ### ###", maxLength: 9 },
  { code: "960", flag: "🇲🇻", name: "Maldives", pattern: "###-####", maxLength: 7 },
  { code: "961", flag: "🇱🇧", name: "Lebanon", pattern: "## ### ###", maxLength: 8 },
  { code: "962", flag: "🇯🇴", name: "Jordan", pattern: "## #### ####", maxLength: 9 },
  { code: "963", flag: "🇸🇾", name: "Syria", pattern: "## #### ###", maxLength: 9 },
  { code: "964", flag: "🇮🇶", name: "Iraq", pattern: "### ### ####", maxLength: 10 },
  { code: "965", flag: "🇰🇼", name: "Kuwait", pattern: "#### ####", maxLength: 8 },
  { code: "966", flag: "🇸🇦", name: "Saudi Arabia", pattern: "## ### ####", maxLength: 9 },
  { code: "967", flag: "🇾🇪", name: "Yemen", pattern: "### ### ###", maxLength: 9 },
  { code: "968", flag: "🇴🇲", name: "Oman", pattern: "## ### ###", maxLength: 8 },
  { code: "970", flag: "🇵🇸", name: "Palestine", pattern: "## ### ####", maxLength: 9 },
  { code: "971", flag: "🇦🇪", name: "United Arab Emirates", pattern: "## ### ####", maxLength: 9 },
  { code: "972", flag: "🇮🇱", name: "Israel", pattern: "##-###-####", maxLength: 9 },
  { code: "973", flag: "🇧🇭", name: "Bahrain", pattern: "#### ####", maxLength: 8 },
  { code: "974", flag: "🇶🇦", name: "Qatar", pattern: "#### ####", maxLength: 8 },
  { code: "975", flag: "🇧🇹", name: "Bhutan", pattern: "## ## ## ##", maxLength: 8 },
  { code: "976", flag: "🇲🇳", name: "Mongolia", pattern: "## ## ####", maxLength: 8 },
  { code: "977", flag: "🇳🇵", name: "Nepal", pattern: "##-#######", maxLength: 9 },
  { code: "992", flag: "🇹🇯", name: "Tajikistan", pattern: "## ### ####", maxLength: 9 },
  { code: "993", flag: "🇹🇲", name: "Turkmenistan", pattern: "## ######", maxLength: 8 },
  { code: "994", flag: "🇦🇿", name: "Azerbaijan", pattern: "## ### ## ##", maxLength: 9 },
  { code: "995", flag: "🇬🇪", name: "Georgia", pattern: "### ### ###", maxLength: 9 },
  { code: "996", flag: "🇰🇬", name: "Kyrgyzstan", pattern: "### ######", maxLength: 9 },
  { code: "998", flag: "🇺🇿", name: "Uzbekistan", pattern: "## ### ####", maxLength: 9 },
];

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function PhoneInput({
  value = "",
  onChange,
  placeholder = "Enter phone number",
  disabled = false,
  className = "",
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = React.useState(
    COUNTRIES.find((c) => c.code === "27") || COUNTRIES[0]
  );
  const [phoneNumber, setPhoneNumber] = React.useState("");

  // Parse initial value if provided
  React.useEffect(() => {
    if (value && value.startsWith("+")) {
      const numericValue = value.substring(1);
      // Try to find matching country by code
      for (const country of COUNTRIES) {
        if (numericValue.startsWith(country.code)) {
          setSelectedCountry(country);
          setPhoneNumber(numericValue.substring(country.code.length));
          break;
        }
      }
    }
  }, [value]);

  // Auto-detect country when user types country code
  const handlePhoneChange = (input: string) => {
    // Remove all non-numeric characters
    const numeric = input.replace(/\D/g, "");

    // Check if user is typing a country code (starts with +)
    if (input.startsWith("+")) {
      const codeToMatch = numeric;

      // Try to match country code (check longer codes first)
      const sortedCountries = [...COUNTRIES].sort((a, b) => b.code.length - a.code.length);

      for (const country of sortedCountries) {
        if (codeToMatch.startsWith(country.code)) {
          setSelectedCountry(country);
          const localNumber = codeToMatch.substring(country.code.length);
          setPhoneNumber(localNumber);
          onChange?.(`+${codeToMatch}`);
          return;
        }
      }

      // If no match yet, just store the numeric value
      setPhoneNumber(numeric);
      onChange?.(`+${numeric}`);
      return;
    }

    // Handle local number (starts with 0) - auto-add country code
    if (numeric.startsWith("0")) {
      const localNumber = numeric.substring(1);
      setPhoneNumber(localNumber);
      onChange?.(`+${selectedCountry.code}${localNumber}`);
      return;
    }

    // Regular number input
    setPhoneNumber(numeric);
    onChange?.(`+${selectedCountry.code}${numeric}`);
  };

  // Format phone number according to country pattern
  const formatPhoneNumber = (num: string, pattern: string): string => {
    let formatted = "";
    let numIndex = 0;

    for (let i = 0; i < pattern.length && numIndex < num.length; i++) {
      if (pattern[i] === "#") {
        formatted += num[numIndex];
        numIndex++;
      } else {
        formatted += pattern[i];
      }
    }

    return formatted;
  };

  const displayValue = phoneNumber ? formatPhoneNumber(phoneNumber, selectedCountry.pattern) : "";

  return (
    <div className={`flex ${className}`}>
      <Select
        value={selectedCountry.code}
        onValueChange={(code) => {
          const country = COUNTRIES.find((c) => c.code === code);
          if (country) {
            setSelectedCountry(country);
            onChange?.(`+${country.code}${phoneNumber}`);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger className="w-[100px] rounded-r-none border-r-0">
          <SelectValue>
            <span className="text-lg">{selectedCountry.flag}</span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {COUNTRIES.map((country) => (
            <SelectItem key={`${country.code}-${country.name}`} value={country.code}>
              <div className="flex items-center gap-2">
                <span className="text-lg">{country.flag}</span>
                <span className="text-sm">{country.name}</span>
                <span className="text-xs text-muted-foreground">+{country.code}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="text"
        value={displayValue}
        onChange={(e) => handlePhoneChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="rounded-l-none flex-1"
        maxLength={selectedCountry.maxLength + selectedCountry.pattern.split("#").length - 1}
      />
    </div>
  );
}
