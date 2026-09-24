import { forwardRef } from "react";
import type { LucideIcon, LucideProps } from "lucide-react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  BanknoteX,
  Bell,
  BellOff,
  Bot,
  BookOpen,
  Box,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleHelp,
  CircleOff,
  Clock,
  Code,
  Copy,
  CornerUpLeft,
  CornerUpRight,
  Cpu,
  CreditCard,
  Database,
  Download,
  Ellipsis,
  ExternalLink,
  Eye,
  EyeOff,
  File,
  FileCode,
  FileText,
  Files,
  Folder,
  Globe,
  Home,
  Image,
  Info,
  Layers,
  Layout,
  LayoutDashboard,
  LayoutGrid,
  Link,
  LoaderCircle,
  Lock,
  LogOut,
  Mail,
  Menu,
  MessageCircle,
  MessageSquare,
  Mic,
  Microscope,
  Monitor,
  Moon,
  Palette,
  PanelLeft,
  Paperclip,
  Pencil,
  Play,
  Plug,
  Plus,
  Presentation,
  Printer,
  Puzzle,
  RefreshCcw,
  RefreshCw,
  RotateCcw,
  Scale,
  Search,
  Settings,
  Settings2,
  Share2,
  Shield,
  SkipForward,
  Smartphone,
  Sparkles,
  Square,
  SquareTerminal,
  Sun,
  Table,
  Tablet,
  Telescope,
  Terminal,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TriangleAlert,
  Unplug,
  Upload,
  User,
  Users,
  WifiOff,
  X,
  Zap,
} from "lucide-react";

export type IconType = LucideIcon;

function grok(Icon: LucideIcon): LucideIcon {
  const Wrapped = forwardRef<SVGSVGElement, LucideProps>(function GrokIcon(props, ref) {
    return (
      <Icon
        ref={ref}
        {...props}
        strokeWidth={props.strokeWidth ?? 2.25}
        absoluteStrokeWidth={false}
      />
    );
  });
  Wrapped.displayName = Icon.displayName ?? Icon.name;
  return Wrapped as unknown as LucideIcon;
}

export const FiActivity = /*#__PURE__*/ grok(Activity);
export const FiAlertCircle = /*#__PURE__*/ grok(CircleAlert);
export const FiAlertTriangle = /*#__PURE__*/ grok(TriangleAlert);
export const FiArrowDown = /*#__PURE__*/ grok(ArrowDown);
export const FiArrowLeft = /*#__PURE__*/ grok(ArrowLeft);
export const FiArrowRight = /*#__PURE__*/ grok(ArrowRight);
export const FiArrowUp = /*#__PURE__*/ grok(ArrowUp);
export const FiBell = /*#__PURE__*/ grok(Bell);
export const FiBellOff = /*#__PURE__*/ grok(BellOff);
export const FiBookOpen = /*#__PURE__*/ grok(BookOpen);
export const FiBriefcase = /*#__PURE__*/ grok(Briefcase);
export const FiCalendar = /*#__PURE__*/ grok(Calendar);
export const FiCheck = /*#__PURE__*/ grok(Check);
export const FiChevronDown = /*#__PURE__*/ grok(ChevronDown);
export const FiChevronLeft = /*#__PURE__*/ grok(ChevronLeft);
export const FiChevronRight = /*#__PURE__*/ grok(ChevronRight);
export const FiChevronUp = /*#__PURE__*/ grok(ChevronUp);
export const FiClock = /*#__PURE__*/ grok(Clock);
export const FiCode = /*#__PURE__*/ grok(Code);
export const FiCopy = /*#__PURE__*/ grok(Copy);
export const FiCornerUpLeft = /*#__PURE__*/ grok(CornerUpLeft);
export const FiCornerUpRight = /*#__PURE__*/ grok(CornerUpRight);
export const FiCpu = /*#__PURE__*/ grok(Cpu);
export const FiCreditCard = /*#__PURE__*/ grok(CreditCard);
export const FiDatabase = /*#__PURE__*/ grok(Database);
export const FiDownload = /*#__PURE__*/ grok(Download);
export const FiEdit2 = /*#__PURE__*/ grok(Pencil);
export const FiEdit3 = FiEdit2;
export const FiExternalLink = /*#__PURE__*/ grok(ExternalLink);
export const FiEye = /*#__PURE__*/ grok(Eye);
export const FiEyeOff = /*#__PURE__*/ grok(EyeOff);
export const FiFile = /*#__PURE__*/ grok(File);
export const FiFileText = /*#__PURE__*/ grok(FileText);
export const FiFolder = /*#__PURE__*/ grok(Folder);
export const FiGlobe = /*#__PURE__*/ grok(Globe);
export const FiGrid = /*#__PURE__*/ grok(LayoutGrid);
export const FiHome = /*#__PURE__*/ grok(Home);
export const FiImage = /*#__PURE__*/ grok(Image);
export const FiInfo = /*#__PURE__*/ grok(Info);
export const FiLayers = /*#__PURE__*/ grok(Layers);
export const FiLayout = /*#__PURE__*/ grok(Layout);
export const FiLink = /*#__PURE__*/ grok(Link);
export const FiLoader = /*#__PURE__*/ grok(LoaderCircle);
export const FiLock = /*#__PURE__*/ grok(Lock);
export const FiLogOut = /*#__PURE__*/ grok(LogOut);
export const FiMail = /*#__PURE__*/ grok(Mail);
export const FiMenu = /*#__PURE__*/ grok(Menu);
export const FiMessageSquare = /*#__PURE__*/ grok(MessageSquare);
export const FiMic = /*#__PURE__*/ grok(Mic);
export const FiMonitor = /*#__PURE__*/ grok(Monitor);
export const FiMoon = /*#__PURE__*/ grok(Moon);
export const FiMoreHorizontal = /*#__PURE__*/ grok(Ellipsis);
export const FiPaperclip = /*#__PURE__*/ grok(Paperclip);
export const FiPlay = /*#__PURE__*/ grok(Play);
export const FiPlus = /*#__PURE__*/ grok(Plus);
export const FiPrinter = /*#__PURE__*/ grok(Printer);
export const FiRefreshCw = /*#__PURE__*/ grok(RefreshCw);
export const FiRotateCcw = /*#__PURE__*/ grok(RotateCcw);
export const FiSearch = /*#__PURE__*/ grok(Search);
export const FiSettings = /*#__PURE__*/ grok(Settings);
export const FiShare2 = /*#__PURE__*/ grok(Share2);
export const FiShield = /*#__PURE__*/ grok(Shield);
export const FiSidebar = /*#__PURE__*/ grok(PanelLeft);
export const FiSkipForward = /*#__PURE__*/ grok(SkipForward);
export const FiSmartphone = /*#__PURE__*/ grok(Smartphone);
export const FiSquare = /*#__PURE__*/ grok(Square);
export const FiSun = /*#__PURE__*/ grok(Sun);
export const FiTablet = /*#__PURE__*/ grok(Tablet);
export const FiTerminal = /*#__PURE__*/ grok(Terminal);
export const FiThumbsDown = /*#__PURE__*/ grok(ThumbsDown);
export const FiThumbsUp = /*#__PURE__*/ grok(ThumbsUp);
export const FiTrash2 = /*#__PURE__*/ grok(Trash2);
export const FiUpload = /*#__PURE__*/ grok(Upload);
export const FiUser = /*#__PURE__*/ grok(User);
export const FiUsers = /*#__PURE__*/ grok(Users);
export const FiWifiOff = /*#__PURE__*/ grok(WifiOff);
export const FiX = /*#__PURE__*/ grok(X);
export const FiZap = /*#__PURE__*/ grok(Zap);

export const TbActivity = /*#__PURE__*/ grok(Activity);
export const TbBell = /*#__PURE__*/ grok(Bell);
export const TbBolt = /*#__PURE__*/ grok(Zap);
export const TbCircleCheck = /*#__PURE__*/ grok(CircleCheck);
export const TbCode = /*#__PURE__*/ grok(Code);
export const TbCreditCard = /*#__PURE__*/ grok(CreditCard);
export const TbCreditCardOff = /*#__PURE__*/ grok(CircleOff);
export const TbCurrencyDollarOff = /*#__PURE__*/ grok(BanknoteX);
export const TbDeviceDesktop = /*#__PURE__*/ grok(Monitor);
export const TbDownload = /*#__PURE__*/ grok(Download);
export const TbFileCode = /*#__PURE__*/ grok(FileCode);
export const TbFileText = /*#__PURE__*/ grok(FileText);
export const TbFiles = /*#__PURE__*/ grok(Files);
export const TbFolder = /*#__PURE__*/ grok(Folder);
export const TbHelpCircle = /*#__PURE__*/ grok(CircleHelp);
export const TbHome = /*#__PURE__*/ grok(Home);
export const TbLayoutDashboard = /*#__PURE__*/ grok(LayoutDashboard);
export const TbLayoutGrid = /*#__PURE__*/ grok(LayoutGrid);
export const TbLayoutSidebar = /*#__PURE__*/ grok(PanelLeft);
export const TbLock = /*#__PURE__*/ grok(Lock);
export const TbLogout = /*#__PURE__*/ grok(LogOut);
export const TbMessageCircle = /*#__PURE__*/ grok(MessageCircle);
export const TbMenu2 = /*#__PURE__*/ grok(Menu);
export const TbX = /*#__PURE__*/ grok(X);
export const TbMicroscope = /*#__PURE__*/ grok(Microscope);
export const TbPalette = /*#__PURE__*/ grok(Palette);
export const TbPaperclip = /*#__PURE__*/ grok(Paperclip);
export const TbPhoto = /*#__PURE__*/ grok(Image);
export const TbPlugConnected = /*#__PURE__*/ grok(Unplug);
export const TbPlus = /*#__PURE__*/ grok(Plus);
export const TbPresentation = /*#__PURE__*/ grok(Presentation);
export const TbPuzzle = /*#__PURE__*/ grok(Puzzle);
export const TbRefreshDot = /*#__PURE__*/ grok(RefreshCcw);
export const TbRobot = /*#__PURE__*/ grok(Bot);
export const TbScale = /*#__PURE__*/ grok(Scale);
export const TbSearch = /*#__PURE__*/ grok(Search);
export const TbSettings = /*#__PURE__*/ grok(Settings);
export const TbSettings2 = /*#__PURE__*/ grok(Settings2);
export const TbSparkles = /*#__PURE__*/ grok(Sparkles);
export const TbTable = /*#__PURE__*/ grok(Table);
export const TbTelescope = /*#__PURE__*/ grok(Telescope);
export const TbTerminal2 = /*#__PURE__*/ grok(SquareTerminal);
export const TbUsers = /*#__PURE__*/ grok(Users);
export const TbWorld = /*#__PURE__*/ grok(Globe);
export const TbPlug = /*#__PURE__*/ grok(Plug);

export const HiOutlineCube = /*#__PURE__*/ grok(Box);
export const HiOutlineSparkles = /*#__PURE__*/ grok(Sparkles);
