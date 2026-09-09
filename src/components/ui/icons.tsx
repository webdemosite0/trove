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
  Box,
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
  User,
  Users,
  WifiOff,
  X,
  Zap,
} from "lucide-react";

/**
 * One icon family for the whole product.
 *
 * Lucide at 1.5px with round caps matches Grok's stroke — thin, even, never
 * the chunky Feather/Tabler mix we had before.
 */
export type IconType = LucideIcon;

function grok(Icon: LucideIcon): LucideIcon {
  const Wrapped = forwardRef<SVGSVGElement, LucideProps>(function GrokIcon(props, ref) {
    return (
      <Icon
        ref={ref}
        {...props}
        strokeWidth={props.strokeWidth ?? 1.5}
        absoluteStrokeWidth={false}
      />
    );
  });
  Wrapped.displayName = Icon.displayName ?? Icon.name;
  return Wrapped as unknown as LucideIcon;
}

export const FiActivity = grok(Activity);
export const FiAlertCircle = grok(CircleAlert);
export const FiAlertTriangle = grok(TriangleAlert);
export const FiArrowDown = grok(ArrowDown);
export const FiArrowLeft = grok(ArrowLeft);
export const FiArrowRight = grok(ArrowRight);
export const FiArrowUp = grok(ArrowUp);
export const FiBell = grok(Bell);
export const FiBellOff = grok(BellOff);
export const FiCalendar = grok(Calendar);
export const FiCheck = grok(Check);
export const FiChevronDown = grok(ChevronDown);
export const FiChevronLeft = grok(ChevronLeft);
export const FiChevronRight = grok(ChevronRight);
export const FiChevronUp = grok(ChevronUp);
export const FiClock = grok(Clock);
export const FiCode = grok(Code);
export const FiCopy = grok(Copy);
export const FiCornerUpLeft = grok(CornerUpLeft);
export const FiCornerUpRight = grok(CornerUpRight);
export const FiCpu = grok(Cpu);
export const FiCreditCard = grok(CreditCard);
export const FiDatabase = grok(Database);
export const FiDownload = grok(Download);
export const FiEdit2 = grok(Pencil);
export const FiExternalLink = grok(ExternalLink);
export const FiEye = grok(Eye);
export const FiEyeOff = grok(EyeOff);
export const FiFile = grok(File);
export const FiFileText = grok(FileText);
export const FiFolder = grok(Folder);
export const FiGlobe = grok(Globe);
export const FiGrid = grok(LayoutGrid);
export const FiInfo = grok(Info);
export const FiLayers = grok(Layers);
export const FiLayout = grok(Layout);
export const FiLink = grok(Link);
export const FiLoader = grok(LoaderCircle);
export const FiLock = grok(Lock);
export const FiLogOut = grok(LogOut);
export const FiMail = grok(Mail);
export const FiMenu = grok(Menu);
export const FiMessageSquare = grok(MessageSquare);
export const FiMic = grok(Mic);
export const FiMonitor = grok(Monitor);
export const FiMoon = grok(Moon);
export const FiMoreHorizontal = grok(Ellipsis);
export const FiPaperclip = grok(Paperclip);
export const FiPlay = grok(Play);
export const FiPlus = grok(Plus);
export const FiPrinter = grok(Printer);
export const FiRefreshCw = grok(RefreshCw);
export const FiRotateCcw = grok(RotateCcw);
export const FiSearch = grok(Search);
export const FiSettings = grok(Settings);
export const FiShare2 = grok(Share2);
export const FiShield = grok(Shield);
export const FiSidebar = grok(PanelLeft);
export const FiSkipForward = grok(SkipForward);
export const FiSmartphone = grok(Smartphone);
export const FiSquare = grok(Square);
export const FiSun = grok(Sun);
export const FiTablet = grok(Tablet);
export const FiTerminal = grok(Terminal);
export const FiThumbsDown = grok(ThumbsDown);
export const FiThumbsUp = grok(ThumbsUp);
export const FiTrash2 = grok(Trash2);
export const FiUser = grok(User);
export const FiUsers = grok(Users);
export const FiWifiOff = grok(WifiOff);
export const FiX = grok(X);
export const FiZap = grok(Zap);

export const TbActivity = grok(Activity);
export const TbBell = grok(Bell);
export const TbBolt = grok(Zap);
export const TbCircleCheck = grok(CircleCheck);
export const TbCode = grok(Code);
export const TbCreditCard = grok(CreditCard);
export const TbCreditCardOff = grok(CircleOff);
export const TbCurrencyDollarOff = grok(BanknoteX);
export const TbDeviceDesktop = grok(Monitor);
export const TbDownload = grok(Download);
export const TbFileCode = grok(FileCode);
export const TbFileText = grok(FileText);
export const TbFiles = grok(Files);
export const TbFolder = grok(Folder);
export const TbHelpCircle = grok(CircleHelp);
export const TbLayoutDashboard = grok(LayoutDashboard);
export const TbLayoutGrid = grok(LayoutGrid);
export const TbLayoutSidebar = grok(PanelLeft);
export const TbLock = grok(Lock);
export const TbLogout = grok(LogOut);
export const TbMessageCircle = grok(MessageCircle);
export const TbMicroscope = grok(Microscope);
export const TbPalette = grok(Palette);
export const TbPaperclip = grok(Paperclip);
export const TbPhoto = grok(Image);
export const TbPlugConnected = grok(Unplug);
export const TbPlus = grok(Plus);
export const TbPresentation = grok(Presentation);
export const TbPuzzle = grok(Puzzle);
export const TbRefreshDot = grok(RefreshCcw);
export const TbRobot = grok(Bot);
export const TbScale = grok(Scale);
export const TbSearch = grok(Search);
export const TbSettings = grok(Settings);
export const TbSettings2 = grok(Settings2);
export const TbSparkles = grok(Sparkles);
export const TbTable = grok(Table);
export const TbTelescope = grok(Telescope);
export const TbTerminal2 = grok(SquareTerminal);
export const TbUsers = grok(Users);
export const TbWorld = grok(Globe);
export const TbPlug = grok(Plug);

export const HiOutlineCube = grok(Box);
export const HiOutlineSparkles = grok(Sparkles);
