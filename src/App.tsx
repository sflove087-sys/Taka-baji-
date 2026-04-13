/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Loader2, Settings } from 'lucide-react';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc, query, where, onSnapshot, orderBy, deleteDoc, updateDoc, getDoc, getDocFromServer, getDocs } from 'firebase/firestore';
import emailjs from '@emailjs/browser';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return new Error(errInfo.error);
};

type View = 'signin' | 'signup' | 'forgot' | 'dashboard' | 'profile' | 'bank' | 'activation' | 'payment' | 'admin' | 'withdraw';
type Language = 'en' | 'bn';

const translations = {
  en: {
    signIn: 'Sign In',
    signUp: 'Sign Up',
    forgotPasswordTitle: 'Forgot Password',
    username: 'Username',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    currency: 'Currency',
    required: 'This field is required.',
    forgotPassword: 'Forgot password?',
    signUpBtn: 'Sign Up!',
    next: 'Next',
    cancel: 'Cancel',
    previous: 'Previous',
    submit: 'Submit',
    firstName: 'First Name',
    lastName: 'Last Name',
    dob: 'Date of Birth',
    phone: 'Phone',
    email: 'Email',
    emailAddress: 'Email Address',
    others: 'Others',
    referralCode: 'Referral Code',
    verificationCode: 'Verification Code',
    verificationCodeSent: 'Verification code sent',
    loginSuccess: 'Login successful',
    signupSuccess: 'Registration successful',
    invalidCredentials: 'Invalid username or password',
    passwordMismatch: 'Passwords do not match',
    fillAllFields: 'Please fill all required fields',
    usernamePlaceholder: '6-18 characters or numbers',
    passwordPlaceholder: '6-20 characters or numbers',
    dashboard: 'Dashboard',
    myAccount: 'My Account',
    profile: 'Profile',
    bank: 'Bank',
    hierarchy: 'Hierarchy',
    affiliateKYC: 'Affiliate KYC',
    material: 'Material',
    report: 'Report',
    commission: 'Commission',
    activePlayers: 'Active Players',
    registeredUsers: 'Registered Users',
    thisPeriod: 'This Period',
    lastPeriod: 'Last Period',
    today: 'Today',
    yesterday: 'Yesterday',
    thisWeek: 'This Week',
    lastWeek: 'Last Week',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    period: 'Period',
    count: 'Count',
    defaultSignupLink: 'Default Player Sign-up Link',
    affiliateReferralLink: 'Affiliate Referral Link',
    logout: 'Logout',
    accountStatus: 'Account Status',
    active: 'Active',
    joinedDate: 'Joined Date',
    personalInfo: 'Personal Information',
    bankSetup: 'Bank Setup',
    selectProvider: 'Select Provider',
    accountNumber: 'Account Number',
    accountName: 'Account Name',
    saveBank: 'Save Bank Details',
    bkash: 'bKash Agent',
    nagad: 'Nagad Agent',
    rocket: 'Rocket Agent',
    bankSuccess: 'Bank details saved successfully',
    bankDeleted: 'Bank details deleted successfully',
    bankHistory: 'Bank Account History',
    passwordResetSuccess: 'Password reset successful. New password sent to your email.',
    userNotFound: 'User not found or email mismatch',
    provider: 'Provider',
    date: 'Date',
    delete: 'Delete',
    confirmDelete: 'Are you sure you want to delete this bank entry?',
    confirm: 'Confirm',
    activationTitle: 'Account Activation Required',
    activationDesc: 'To activate your account and start using our services, you need to make a one-time deposit of 10,000 BDT.',
    depositNow: 'Deposit Now',
    paymentTitle: 'bKash Payment',
    transactionId: 'Transaction ID',
    creationTime: 'Creation Time',
    paymentInstructions: 'Confirm if your transferred amount matches the deposit amount. We will not be responsible if your deposit is missing due to providing incorrect information. Cash out using the phone number registered on our site, avoid depositing from third-party numbers. After submitting the deposit form, send money to the account number below within 09:09 minutes.',
    copy: 'Copy',
    amount: 'Amount',
    senderNumber: 'Phone Number / Send-money Number',
    reference: 'Reference Number / Transaction ID',
    submitPayment: 'Submit Payment',
    paymentPending: 'Your payment is being verified. Please wait.',
    autoApproved: 'Payment verified! Your account is now active.',
    invalidTxId: 'Invalid Transaction ID. Please check and try again.',
    adminPanel: 'Admin Panel',
    userManagement: 'User Management',
    walletSettings: 'Wallet Settings',
    logoSettings: 'Logo Settings',
    status: 'Status',
    action: 'Action',
    activate: 'Activate',
    deactivate: 'Deactivate',
    walletNumber: 'Wallet Number',
    wallet: 'Wallet',
    saveSettings: 'Save Settings',
    logoUrl: 'Logo URL',
    uploadReceipt: 'Upload Payment Receipt',
    selectFile: 'Select Image',
    balance: 'Balance',
    refresh: 'Refresh',
    approvedDeposits: 'Approved Deposits',
    withdraw: 'Withdraw',
    withdrawAmount: 'Withdraw Amount',
    withdrawMethod: 'Withdraw Method',
    withdrawHistory: 'Withdraw History',
    withdrawPending: 'Withdrawal request submitted and pending approval.',
    withdrawSuccess: 'Withdrawal approved and processed.',
    withdrawError: 'Insufficient balance or invalid amount.',
    agentName: 'Agent Name',
    agentNumber: 'Agent Number',
    withdrawNow: 'Withdraw Now',
    bankAccount: 'Bank Account',
    bankName: 'Bank Name',
    branchName: 'Branch Name',
    accountHolderName: 'Account Holder Name',
    editProfile: 'Edit Profile',
    updateProfile: 'Update Profile',
    profileUpdated: 'Profile updated successfully',
    languages: {
      en: 'English',
      bn: 'Bangla',
    },
  },
  bn: {
    signIn: 'সাইন ইন',
    signUp: 'সাইন আপ',
    forgotPasswordTitle: 'পাসওয়ার্ড ভুলে গেছেন',
    username: 'ইউজারনেম',
    password: 'পাসওয়ার্ড',
    confirmPassword: 'পাসওয়ার্ড নিশ্চিত করুন',
    currency: 'কারেন্সি',
    required: 'এই ক্ষেত্রটি পূরণ করা আবশ্যক।',
    forgotPassword: 'পাসওয়ার্ড ভুলে গেছেন?',
    signUpBtn: 'সাইন আপ করুন!',
    next: 'পরবর্তী',
    previous: 'পূর্ববর্তী',
    submit: 'জমা দিন',
    firstName: 'প্রথম নাম',
    lastName: 'শেষ নাম',
    dob: 'জন্ম তারিখ',
    phone: 'ফোন',
    email: 'ইমেইল',
    emailAddress: 'ইমেইল ঠিকানা',
    others: 'অন্যান্য',
    referralCode: 'রেফারেল কোড',
    verificationCode: 'ভেরিফিকেশন কোড',
    verificationCodeSent: 'ভেরিফিকেশন কোড পাঠানো হয়েছে',
    loginSuccess: 'লগইন সফল হয়েছে',
    signupSuccess: 'নিবন্ধন সফল হয়েছে',
    invalidCredentials: 'ইউজারনেম বা পাসওয়ার্ড ভুল',
    passwordMismatch: 'পাসওয়ার্ড মেলেনি',
    fillAllFields: 'সবগুলো ঘর পূরণ করুন',
    usernamePlaceholder: '৬-১৮টি অক্ষর বা সংখ্যা',
    passwordPlaceholder: '৬-২০টি অক্ষর বা সংখ্যা',
    dashboard: 'ড্যাশবোর্ড',
    myAccount: 'আমার অ্যাকাউন্ট',
    profile: 'প্রোফাইল',
    bank: 'ব্যাংক',
    hierarchy: 'হায়ারার্কি',
    affiliateKYC: 'অ্যাফিলিয়েট কেওয়াইসি',
    material: 'মেটেরিয়াল',
    report: 'রিপোর্ট',
    commission: 'কমিশন',
    activePlayers: 'সক্রিয় প্লেয়ার',
    registeredUsers: 'নিবন্ধিত ব্যবহারকারী',
    thisPeriod: 'এই পিরিয়ড',
    lastPeriod: 'গত পিরিয়ড',
    today: 'আজ',
    yesterday: 'গতকাল',
    thisWeek: 'এই সপ্তাহ',
    lastWeek: 'গত সপ্তাহ',
    thisMonth: 'এই মাস',
    lastMonth: 'গত মাস',
    period: 'পিরিয়ড',
    count: 'সংখ্যা',
    defaultSignupLink: 'ডিফল্ট প্লেয়ার সাইন-আপ লিঙ্ক',
    affiliateReferralLink: 'অ্যাফিলিয়েট রেফারেল লিঙ্ক',
    logout: 'লগআউট',
    accountStatus: 'অ্যাকাউন্ট স্ট্যাটাস',
    active: 'সক্রিয়',
    joinedDate: 'যোগদানের তারিখ',
    personalInfo: 'ব্যক্তিগত তথ্য',
    bankSetup: 'ব্যাংক সেটআপ',
    selectProvider: 'প্রোভাইডার নির্বাচন করুন',
    accountNumber: 'অ্যাকাউন্ট নম্বর',
    accountName: 'অ্যাকাউন্ট নাম',
    saveBank: 'ব্যাংক তথ্য সেভ করুন',
    bkash: 'বিকাশ এজেন্ট',
    nagad: 'নগদ এজেন্ট',
    rocket: 'রকেট এজেন্ট',
    bankSuccess: 'ব্যাংক তথ্য সফলভাবে সেভ হয়েছে',
    bankDeleted: 'ব্যাংক তথ্য সফলভাবে ডিলিট হয়েছে',
    bankHistory: 'ব্যাংক অ্যাকাউন্টের ইতিহাস',
    passwordResetSuccess: 'পাসওয়ার্ড রিসেট সফল হয়েছে। আপনার ইমেইলে নতুন পাসওয়ার্ড পাঠানো হয়েছে।',
    userNotFound: 'ব্যবহারকারী পাওয়া যায়নি বা ইমেইল মেলেনি',
    provider: 'প্রোভাইডার',
    date: 'তারিখ',
    delete: 'ডিলিট',
    confirmDelete: 'আপনি কি নিশ্চিত যে আপনি এই ব্যাংক এন্ট্রিটি ডিলিট করতে চান?',
    confirm: 'নিশ্চিত করুন',
    activationTitle: 'অ্যাকাউন্ট অ্যাক্টিভেশন প্রয়োজন',
    activationDesc: 'আপনার অ্যাকাউন্ট সক্রিয় করতে এবং আমাদের পরিষেবাগুলি ব্যবহার শুরু করতে, আপনাকে ১০,০০০ টাকা এককালীন ডিপোজিট করতে হবে।',
    depositNow: 'ডিপোজিট করুন',
    paymentTitle: 'বিকাশ পেমেন্ট',
    transactionId: 'ট্রানজেকশন আইডি',
    creationTime: 'ট্রানজেকশন ক্রিয়েট হওয়ার সময়',
    paymentInstructions: 'আপনার ট্রান্সফার করা টাকার পরিমাণ ডিপোজিট এমাউন্টের সমান কিনা তা নিশ্চিত করুন। ভুল তথ্য প্রদানের কারণে আপনার ডিপোজিটটি মিসিং হলে আমরা দায়ী থাকব না। আমাদের সাইটে রেজিস্টার করা ফোন নম্বর ব্যবহার করে ক্যাশআউট করুন, থার্ডপার্টি নম্বর থেকে ডিপোজিট করায় বিরত থাকুন। ডিপোজিট ফর্ম সাবমিট করার পর ০৯ : ০৯ মিনিটের মধ্যে নিচের অ্যাকাউন্ট নম্বরে সেন্ড মানি করুন',
    copy: 'কপি',
    amount: 'পরিমাণ',
    senderNumber: 'ফোন নম্বর / সেন্ড-মানি নম্বর',
    reference: 'রেফারেন্স নম্বর / ট্রানজেকশন আইডি',
    submitPayment: 'পেমেন্ট সাবমিট করুন',
    paymentPending: 'আপনার পেমেন্ট যাচাই করা হচ্ছে। অনুগ্রহ করে অপেক্ষা করুন।',
    autoApproved: 'পেমেন্ট যাচাই করা হয়েছে! আপনার অ্যাকাউন্ট এখন সক্রিয়।',
    invalidTxId: 'ট্রানজেকশন আইডি সঠিক নয়। অনুগ্রহ করে আবার চেষ্টা করুন।',
    adminPanel: 'অ্যাডমিন প্যানেল',
    userManagement: 'ইউজার ম্যানেজমেন্ট',
    walletSettings: 'ওয়ালেট সেটিংস',
    logoSettings: 'লোগো সেটিংস',
    status: 'স্ট্যাটাস',
    action: 'অ্যাকশন',
    activate: 'অ্যাক্টিভেট',
    deactivate: 'ডিঅ্যাক্টিভেট',
    walletNumber: 'ওয়ালেট নম্বর',
    wallet: 'ওয়ালেট',
    saveSettings: 'সেটিংস সেভ করুন',
    logoUrl: 'লোগো ইউআরএল',
    uploadReceipt: 'পেমেন্ট রিসিভ আপলোড করুন',
    selectFile: 'ছবি নির্বাচন করুন',
    balance: 'ব্যালেন্স',
    refresh: 'রিফ্রেশ',
    approvedDeposits: 'অনুমোদিত ডিপোজিট',
    withdraw: 'উইথড্র',
    withdrawAmount: 'উইথড্র পরিমাণ',
    withdrawMethod: 'উইথড্র পদ্ধতি',
    withdrawHistory: 'উইথড্র ইতিহাস',
    withdrawPending: 'উইথড্র অনুরোধ জমা দেওয়া হয়েছে এবং অনুমোদনের অপেক্ষায় আছে।',
    withdrawSuccess: 'উইথড্র অনুমোদিত এবং সম্পন্ন হয়েছে।',
    withdrawError: 'অপর্যাপ্ত ব্যালেন্স বা ভুল পরিমাণ।',
    agentName: 'এজেন্ট নাম',
    agentNumber: 'এজেন্ট নম্বর',
    withdrawNow: 'উইথড্র করুন',
    bankAccount: 'ব্যাংক অ্যাকাউন্ট',
    bankName: 'ব্যাংকের নাম',
    branchName: 'শাখার নাম',
    accountHolderName: 'অ্যাকাউন্ট হোল্ডারের নাম',
    editProfile: 'প্রোফাইল এডিট করুন',
    updateProfile: 'প্রোফাইল আপডেট করুন',
    profileUpdated: 'প্রোফাইল সফলভাবে আপডেট করা হয়েছে',
    cancel: 'বাতিল করুন',
    languages: {
      en: 'English',
      bn: 'বাংলা',
    },
  },
};

export default function App() {
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [view, setView] = useState<View>('signin');
  const [signupStep, setSignupStep] = useState(1);
  const [lang, setLang] = useState<Language>('bn');
  const [showErrors, setShowErrors] = useState(false);
  const [captcha, setCaptcha] = useState('2482');
  const [loading, setLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAccountExpanded, setIsAccountExpanded] = useState(true);
  const [isReportExpanded, setIsReportExpanded] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [isRegisteredUsersExpanded, setIsRegisteredUsersExpanded] = useState(true);
  const [modalType, setModalType] = useState<'success' | 'error'>('success');
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [allWithdrawals, setAllWithdrawals] = useState<any[]>([]);
  const [withdrawData, setWithdrawData] = useState({
    amount: '',
    method: 'bkash',
    accountNumber: '',
    bankName: '',
    branchName: '',
    accountHolderName: ''
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileData, setEditProfileData] = useState<any>({});
  const [sheetTransactions, setSheetTransactions] = useState<any[]>([]);
  const [approvedDeposits, setApprovedDeposits] = useState<any[]>([]);
  const [adminTab, setAdminTab] = useState<'users' | 'recharge_requests' | 'tnxid_list' | 'logo_settings' | 'withdrawal_requests'>('users');
  const [appSettings, setAppSettings] = useState({
    walletNumber: '01602872965',
    bkashLogo: 'https://raw.githubusercontent.com/sflove087/assets/main/bkash_logo.png',
    nagadLogo: 'https://raw.githubusercontent.com/sflove087/assets/main/nagad_logo.png',
    rocketLogo: 'https://raw.githubusercontent.com/sflove087/assets/main/rocket_logo.png',
    walletIllustration: 'https://raw.githubusercontent.com/sflove087/assets/main/wallet_illustration.png',
    bkashAgentNumber: '01748231914,01764810008,01723993331',
    bkashAgentName: 'bKash Agent',
    nagadAgentNumber: '01748231914,01764810008,01723993331',
    nagadAgentName: 'Nagad Agent',
    rocketAgentNumber: '01748231914,01764810008,01723993331',
    rocketAgentName: 'Rocket Agent',
    isBkashEnabled: true,
    isNagadEnabled: true,
    isRocketEnabled: true,
    isWalletNumberEnabled: true
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'global'), (doc) => {
      if (doc.exists()) {
        setAppSettings(prev => ({ ...prev, ...doc.data() }));
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUserData?.username) return;
    const q = query(
      collection(db, 'withdrawals'),
      where('username', '==', currentUserData.username),
      orderBy('timestamp', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setWithdrawals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [currentUserData?.username]);

  useEffect(() => {
    if (currentUserData?.username !== 'saju241') return;
    const q = query(collection(db, 'withdrawals'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setAllWithdrawals(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [currentUserData?.username]);

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), appSettings);
      setModalType('success');
      setModalMessage(t.bankSuccess);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setLoading(false);
    }
  };
  const [modalMessage, setModalMessage] = useState('');

  const [activeAgentNumber, setActiveAgentNumber] = useState('');

  useEffect(() => {
    if (view === 'payment') {
      let numbersStr = '';
      if (selectedMethod === 'bkash') numbersStr = appSettings.bkashAgentNumber;
      else if (selectedMethod === 'nagad') numbersStr = appSettings.nagadAgentNumber;
      else if (selectedMethod === 'rocket') numbersStr = appSettings.rocketAgentNumber;
      else if (selectedMethod === 'wallet') numbersStr = appSettings.walletNumber;

      const numbers = numbersStr.split(',').map(n => n.trim()).filter(n => n);
      if (numbers.length > 0) {
        setActiveAgentNumber(numbers[Math.floor(Math.random() * numbers.length)]);
      }
    }
  }, [view, selectedMethod, appSettings]);

  useEffect(() => {
    if (view === 'activation' && currentUserData?.isActivated) {
      setView('dashboard');
    }
  }, [view, currentUserData]);

  useEffect(() => {
    if (view === 'admin' || view === 'payment') {
      let unsub: (() => void) | undefined;
      
      if (view === 'admin') {
        const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
          const users = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setAllUsers(users);
        });

        const unsubDeposits = onSnapshot(query(collection(db, 'deposits'), orderBy('timestamp', 'desc')), (snap) => {
          const deposits = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setApprovedDeposits(deposits);
        });

        unsub = () => {
          unsubUsers();
          unsubDeposits();
        };
      }

      const fetchSheetData = async () => {
        try {
          const response = await fetch('https://docs.google.com/spreadsheets/d/e/2PACX-1vRRxs70b1-0PBLYmqzSa0SJlVxwRQgL4W5ace_XMNzDUDCesP50npiE1y_Q1nYfVZnk8DSjmlU65Ek6/pub?output=tsv');
          const text = await response.text();
          const rows = text.split('\n').filter(row => row.trim());
          const parsed = rows.slice(1).map(row => {
            const cols = row.split('\t');
            return {
              mode: cols[0] || '',
              txId: cols[1]?.trim().toLowerCase().replace(/\r/g, '').replace(/^"|"$/g, '') || 'N/A',
              phone: cols[2]?.trim().replace(/\r/g, '').replace(/^"|"$/g, '') || 'N/A',
              date: cols[3]?.trim().replace(/\r/g, '').replace(/^"|"$/g, '') || '',
              amount: cols[4]?.trim().replace(/\r/g, '').replace(/^"|"$/g, '') || ''
            };
          });
          setSheetTransactions(parsed);
        } catch (error) {
          console.error('Error fetching sheet data:', error);
        }
      };

      fetchSheetData();
      const interval = setInterval(fetchSheetData, 30000); // Refresh every 30s

      return () => {
        if (unsub) unsub();
        clearInterval(interval);
      };
    }
  }, [view]);

  const [selectedAdminUser, setSelectedAdminUser] = useState<any>(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [adminModalType, setAdminModalType] = useState<'view' | 'edit'>('view');
  const [editUserForm, setEditUserForm] = useState<any>({});

  const handleDeleteUser = async (username: string) => {
    if (!window.confirm(lang === 'bn' ? 'আপনি কি নিশ্চিত যে আপনি এই ব্যবহারকারীকে ডিলিট করতে চান?' : 'Are you sure you want to delete this user?')) return;
    try {
      await deleteDoc(doc(db, 'users', username));
      setModalType('success');
      setModalMessage(lang === 'bn' ? 'ব্যবহারকারী সফলভাবে ডিলিট করা হয়েছে' : 'User deleted successfully');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleToggleUserLock = async (username: string, isLocked: boolean) => {
    try {
      await updateDoc(doc(db, 'users', username), { isLocked });
    } catch (error) {
      console.error('Error toggling user lock:', error);
    }
  };

  const handleUpdateUserDetails = async () => {
    if (!selectedAdminUser) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', selectedAdminUser.username), editUserForm);
      setIsAdminModalOpen(false);
      setModalType('success');
      setModalMessage(lang === 'bn' ? 'ব্যবহারকারীর তথ্য আপডেট করা হয়েছে' : 'User details updated');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error updating user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintUser = (user: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const content = `
      <html>
        <head>
          <title>User Details - ${user.username}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; }
            h1 { border-bottom: 2px solid #334155; padding-bottom: 10px; color: #1e293b; }
            .detail-row { display: flex; border-bottom: 1px solid #e2e8f0; padding: 10px 0; }
            .label { font-weight: bold; width: 200px; color: #64748b; text-transform: uppercase; font-size: 12px; }
            .value { color: #1e293b; font-weight: 600; }
            .footer { margin-top: 50px; font-size: 10px; color: #94a3b8; text-align: center; }
          </style>
        </head>
        <body>
          <h1>User Profile: ${user.username}</h1>
          <div class="detail-row"><div class="label">Username</div><div class="value">${user.username}</div></div>
          <div class="detail-row"><div class="label">Full Name</div><div class="value">${user.firstName} ${user.lastName}</div></div>
          <div class="detail-row"><div class="label">Email</div><div class="value">${user.email}</div></div>
          <div class="detail-row"><div class="label">Phone</div><div class="value">${user.phone}</div></div>
          <div class="detail-row"><div class="label">Balance</div><div class="value">৳${user.balance || 0}</div></div>
          <div class="detail-row"><div class="label">Status</div><div class="value">${user.isActivated ? 'Active' : 'Inactive'}</div></div>
          <div class="detail-row"><div class="label">Locked</div><div class="value">${user.isLocked ? 'Yes' : 'No'}</div></div>
          <div class="detail-row"><div class="label">Joined</div><div class="value">${user.createdAt?.toDate ? user.createdAt.toDate().toLocaleString() : 'N/A'}</div></div>
          <div class="footer">Generated on ${new Date().toLocaleString()}</div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handleUpdateUserStatus = async (username: string, isActivated: boolean) => {
    try {
      await updateDoc(doc(db, 'users', username), {
        isActivated,
        activationStatus: isActivated ? 'completed' : 'none'
      });
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const [bankData, setBankData] = useState({
    provider: '',
    accountNumber: '',
    accountName: '',
  });
  const [bankHistory, setBankHistory] = useState<any[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [forgotData, setForgotData] = useState({
    username: '',
    email: '',
  });

  const [paymentData, setPaymentData] = useState({
    senderNumber: '',
    transactionId: '',
    amount: 10000,
    receipt: null as File | null,
    generatedTxId: 'D' + Math.random().toString().slice(2, 12),
    createdAt: new Date().toLocaleString('en-GB', { timeZone: 'GMT' }).replace(',', '') + ' (GMT+6)'
  });

  const [timeLeft, setTimeLeft] = useState(549); // 09:09 in seconds

  useEffect(() => {
    if (view !== 'payment') {
      setTimeLeft(549);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [view]);

  const toBanglaDigits = (num: number | string) => {
    const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().split('').map(digit => banglaDigits[parseInt(digit)] || digit).join('');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${toBanglaDigits(mins.toString().padStart(2, '0'))} : ${toBanglaDigits(secs.toString().padStart(2, '0'))}`;
  };

  const formatTimeEn = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
        console.log("Firestore connection successful");
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          console.error("Please check your Firebase configuration. Firestore is offline.");
        }
      }
    }
    testConnection();
  }, []);

  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    currency: '',
    firstName: '',
    lastName: '',
    dob: '',
    phone: '',
    email: '',
    others: '',
    referralCode: '',
    verificationCode: '',
  });

  const t = translations[lang];

  const toggleView = (newView: View) => {
    setView(newView);
    setSignupStep(1);
    setShowErrors(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'username') {
      finalValue = value.toLowerCase();
    }
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) {
      setShowErrors(true);
      return;
    }
    
    setLoading(true);
    try {
      // Log login attempt to Firestore
      await addDoc(collection(db, 'login_logs'), {
        username: formData.username,
        timestamp: serverTimestamp(),
        status: 'attempt'
      });
      
      // Real validation against Firestore users collection
      const { getDoc, doc } = await import('firebase/firestore');
      const userDoc = await getDoc(doc(db, 'users', formData.username));
      
      let userData = null;
      let isValid = false;

      // Hardcoded admin check
      if (formData.username === 'saju241' && formData.password === '2580aA') {
        isValid = true;
        userData = userDoc.exists() ? userDoc.data() : {
          username: 'saju241',
          email: 'admin@example.com',
          isActivated: true,
          role: 'admin'
        };
      } else if (userDoc.exists() && userDoc.data().password === formData.password) {
        if (userDoc.data().isLocked) {
          setModalType('error');
          setModalMessage(lang === 'bn' ? 'আপনার অ্যাকাউন্টটি লক করা হয়েছে। অনুগ্রহ করে এডমিনের সাথে যোগাযোগ করুন।' : 'Your account has been locked. Please contact admin.');
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
          setLoading(false);
          return;
        }
        isValid = true;
        userData = userDoc.data();
      }
      
      if (isValid && userData) {
        setCurrentUserData(userData);
        
        if (!userData.isActivated) {
          setModalType('success');
          setModalMessage(t.activationTitle);
          setShowSuccess(true);
          setTimeout(() => {
            setShowSuccess(false);
            setView('activation');
          }, 1500);
          return;
        }

        setModalType('success');
        setModalMessage(t.loginSuccess);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setView('dashboard');
        }, 1500);
      } else {
        setModalType('error');
        setModalMessage(t.invalidCredentials);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Error logging login:', error);
      setModalType('error');
      setModalMessage('Error: ' + error);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (formData.password !== formData.confirmPassword) {
      setModalType('error');
      setModalMessage(t.passwordMismatch);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    if (!formData.username || !formData.password || !formData.email || !formData.phone || !formData.firstName || !formData.lastName || !formData.dob || !formData.currency || !formData.verificationCode) {
      setModalType('error');
      setModalMessage(t.fillAllFields);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    if (formData.verificationCode !== captcha) {
      setModalType('error');
      setModalMessage(lang === 'bn' ? 'ভেরিফিকেশন কোড ভুল' : 'Invalid verification code');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    setLoading(true);
    try {
      // Save user data to Firestore
      await setDoc(doc(db, 'users', formData.username), {
        ...formData,
        isActivated: false,
        activationStatus: 'none',
        createdAt: serverTimestamp()
      });
      
      setModalType('success');
      setModalMessage(t.signupSuccess);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setView('signin');
      }, 3000);
    } catch (error) {
      console.error('Error saving user:', error);
      setModalType('error');
      setModalMessage('Error: ' + error);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (signupStep === 1) {
      if (!formData.username || !formData.password || !formData.confirmPassword || !formData.currency) {
        setModalType('error');
        setModalMessage(t.fillAllFields);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setModalType('error');
        setModalMessage(t.passwordMismatch);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        return;
      }
    }
    if (signupStep === 2) {
      if (!formData.firstName || !formData.lastName || !formData.dob) {
        setModalType('error');
        setModalMessage(t.fillAllFields);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        return;
      }
    }
    setSignupStep(signupStep + 1);
  };

  const handleForgotSubmit = async () => {
    if (!forgotData.username || !forgotData.email) {
      setModalType('error');
      setModalMessage(t.fillAllFields);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, 'users', forgotData.username);
      let userSnap;
      try {
        userSnap = await getDoc(userRef);
      } catch (err) {
        throw handleFirestoreError(err, OperationType.GET, `users/${forgotData.username}`);
      }

      if (userSnap.exists() && userSnap.data().email.toLowerCase() === forgotData.email.toLowerCase()) {
        const userData = userSnap.data();
        const today = new Date().toISOString().split('T')[0];
        
        let resetCount = userData.resetCount || 0;
        let lastResetDate = userData.lastResetDate || '';

        if (lastResetDate === today) {
          if (resetCount >= 2) {
            setModalType('error');
            setModalMessage('You have reached the daily limit of 2 password resets.');
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 3000);
            return;
          }
          resetCount += 1;
        } else {
          resetCount = 1;
          lastResetDate = today;
        }

        const newPassword = Math.random().toString(36).slice(-8);
        
        // Send email via EmailJS FIRST
        const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
        const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
        const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

        if (serviceId && templateId && publicKey) {
          try {
            const response = await emailjs.send(
              serviceId,
              templateId,
              {
                to_name: userSnap.data().firstName || forgotData.username,
                to_email: forgotData.email,
                new_password: newPassword,
                username: forgotData.username
              },
              publicKey
            );
            console.log('EmailJS Success:', response);
          } catch (err: any) {
            console.error('EmailJS error:', err);
            const errorMsg = err?.text || err?.message || 'Unknown EmailJS error';
            setModalType('error');
            setModalMessage(`Email sending failed: ${errorMsg}. Password NOT changed.`);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 7000);
            return;
          }
        } else {
          console.warn('EmailJS credentials missing.');
          setModalType('error');
          setModalMessage('Email service not configured. Please contact support.');
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 5000);
          return;
        }

        // ONLY IF EMAIL SUCCEEDS: Update password and limit in Firestore
        try {
          await updateDoc(userRef, {
            password: newPassword,
            updatedAt: serverTimestamp(),
            resetCount: resetCount,
            lastResetDate: lastResetDate
          });
        } catch (err) {
          throw handleFirestoreError(err, OperationType.UPDATE, `users/${forgotData.username}`);
        }

        setModalType('success');
        setModalMessage(t.passwordResetSuccess);
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          toggleView('signin');
          setForgotData({ username: '', email: '' });
        }, 3000);
      } else {
        setModalType('error');
        setModalMessage(t.userNotFound);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error: any) {
      console.error('Error resetting password:', error);
      setModalType('error');
      setModalMessage(error.message || 'An error occurred. Please try again.');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const sendSignupOTP = async () => {
    setLoading(true);
    try {
      const newOTP = Math.floor(100000 + Math.random() * 900000).toString();
      setCaptcha(newOTP);
      
      setModalType('success');
      setModalMessage(lang === 'bn' ? `আপনার ভেরিফিকেশন কোড: ${newOTP}` : `Your verification code is: ${newOTP}`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error: any) {
      console.error('Error generating OTP:', error);
      setModalType('error');
      setModalMessage('Failed to generate OTP');
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const refreshCaptcha = () => {
    const newCaptcha = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptcha(newCaptcha);
  };

  useEffect(() => {
    refreshCaptcha();
  }, []);

  useEffect(() => {
    if ((view === 'bank' || view === 'withdraw') && currentUserData) {
      const q = query(
        collection(db, 'bank_details'),
        where('username', '==', currentUserData.username),
        orderBy('updatedAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const history = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setBankHistory(history);
      });

      return () => unsubscribe();
    }
  }, [view, currentUserData]);

  const handlePaymentSubmit = async () => {
    if (!paymentData.senderNumber || !paymentData.transactionId) {
      setModalType('error');
      setModalMessage(t.fillAllFields);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    setLoading(true);
    try {
      // 1. Check if this Transaction ID has already been used in Firestore
      const dupQuery = query(collection(db, 'deposits'), where('transactionId', '==', paymentData.transactionId.trim()));
      const dupSnap = await getDocs(dupQuery);
      
      if (!dupSnap.empty) {
        setModalType('error');
        setModalMessage(lang === 'bn' ? 'এই ট্রানজেকশন আইডিটি ইতিমধ্যে ব্যবহার করা হয়েছে।' : 'This Transaction ID has already been used.');
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setLoading(false);
        return;
      }

      // 2. Auto-approval logic using the same list as Admin Panel
      let isAutoApproved = false;
      const searchId = paymentData.transactionId.trim().toLowerCase();
      const searchAmount = paymentData.amount.toString().trim();
      
      // Use the already fetched sheetTransactions state
      isAutoApproved = sheetTransactions.some(tx => {
        const sheetTxId = tx.txId;
        const rawSheetAmount = tx.amount;
        
        // Normalize sheet amount: remove commas and other non-numeric chars except dot
        const normalizedSheetAmount = rawSheetAmount?.replace(/[^0-9.]/g, '');
        const sheetAmountNum = parseFloat(normalizedSheetAmount || '0');
        const searchAmountNum = parseFloat(searchAmount);
        
        // Log for debugging (visible in console)
        if (sheetTxId && (sheetTxId === searchId || sheetTxId.includes(searchId))) {
          console.log('Found ID match in Admin List:', sheetTxId, 'vs', searchId);
          console.log('Checking amount:', sheetAmountNum, 'vs', searchAmountNum, '(Raw:', rawSheetAmount, ')');
        }

        // Use a small epsilon for float comparison
        return sheetTxId === searchId && Math.abs(sheetAmountNum - searchAmountNum) < 0.01;
      });

      // Fallback: If state is empty, try one direct fetch (just in case)
      if (!isAutoApproved && sheetTransactions.length === 0) {
        const sheetUrl = import.meta.env.VITE_GOOGLE_SHEET_TSV_URL;
        if (sheetUrl) {
          try {
            const response = await fetch(sheetUrl);
            const tsvText = await response.text();
            const rows = tsvText.split('\n');
            isAutoApproved = rows.some(row => {
              const columns = row.split('\t');
              if (columns.length < 5) return false;
              const sheetTxId = columns[1]?.trim().toLowerCase().replace(/\r/g, '').replace(/^"|"$/g, '');
              const rawSheetAmount = columns[4]?.trim().replace(/\r/g, '').replace(/^"|"$/g, '');
              const normalizedSheetAmount = rawSheetAmount?.replace(/[^0-9.]/g, '');
              const sheetAmountNum = parseFloat(normalizedSheetAmount || '0');
              const searchAmountNum = parseFloat(searchAmount);
              return sheetTxId === searchId && Math.abs(sheetAmountNum - searchAmountNum) < 0.01;
            });
          } catch (err) {
            console.error('Fallback fetch error:', err);
          }
        }
      }

      if (!isAutoApproved) {
        setModalType('error');
        setModalMessage(t.invalidTxId);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        setLoading(false);
        return;
      }

      // Create deposit record
      await addDoc(collection(db, 'deposits'), {
        username: currentUserData.username,
        amount: paymentData.amount,
        transactionId: paymentData.transactionId,
        senderNumber: paymentData.senderNumber,
        status: 'approved',
        timestamp: serverTimestamp()
      });

      // Update user status and add to balance
      const currentBalance = Number(currentUserData.balance || 0);
      await updateDoc(doc(db, 'users', currentUserData.username), {
        isActivated: true,
        activationStatus: 'completed',
        balance: currentBalance + paymentData.amount
      });
      
      setModalType('success');
      setModalMessage(t.autoApproved);
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        setView('dashboard');
        // Refresh user data
        refreshBalance();
      }, 3000);
    } catch (error) {
      console.error('Error submitting payment:', error);
      setModalType('error');
      setModalMessage('Error: ' + error);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const refreshUserData = async () => {
    if (!currentUserData?.username) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'users', currentUserData.username));
      if (snap.exists()) {
        setCurrentUserData(snap.data());
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    if (!currentUserData?.username) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'users', currentUserData.username));
      if (snap.exists()) {
        setCurrentUserData(snap.data());
      }
    } catch (error) {
      console.error('Error refreshing balance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopying(true);
    setTimeout(() => setIsCopying(false), 1500);
  };

  const handleLogout = () => {
    setView('signin');
    setIsSidebarOpen(false);
    setCurrentUserData(null);
  };

  const handleBankSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankData.provider || !bankData.accountNumber || !bankData.accountName) {
      setModalType('error');
      setModalMessage(t.fillAllFields);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'bank_details'), {
        ...bankData,
        username: currentUserData.username,
        updatedAt: serverTimestamp()
      });
      setBankData({
        provider: '',
        accountNumber: '',
        accountName: '',
      });
      setModalType('success');
      setModalMessage(t.bankSuccess);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving bank:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', currentUserData.username), editProfileData);
      setCurrentUserData({ ...currentUserData, ...editProfileData });
      setIsEditingProfile(false);
      setModalType('success');
      setModalMessage(t.profileUpdated);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawData.amount || !withdrawData.accountNumber || !withdrawData.method) {
      setModalType('error');
      setModalMessage(t.fillAllFields);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    const amount = Number(withdrawData.amount);
    if (isNaN(amount) || amount <= 0) {
      setModalType('error');
      setModalMessage(t.withdrawError);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    if (amount > (currentUserData?.balance || 0)) {
      setModalType('error');
      setModalMessage(t.withdrawError);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      return;
    }

    setLoading(true);
    try {
      // Create withdrawal request
      const withdrawPayload: any = {
        username: currentUserData.username,
        amount: amount,
        method: withdrawData.method,
        accountNumber: withdrawData.accountNumber,
        status: 'pending',
        timestamp: serverTimestamp()
      };

      if (withdrawData.method === 'bank') {
        withdrawPayload.bankName = withdrawData.bankName;
        withdrawPayload.branchName = withdrawData.branchName;
        withdrawPayload.accountHolderName = withdrawData.accountHolderName;
      }

      await addDoc(collection(db, 'withdrawals'), withdrawPayload);

      // Deduct from balance
      await updateDoc(doc(db, 'users', currentUserData.username), {
        balance: (currentUserData.balance || 0) - amount
      });

      setModalType('success');
      setModalMessage(t.withdrawPending);
      setShowSuccess(true);
      setWithdrawData({ amount: '', method: 'bkash', accountNumber: '' });
      refreshBalance();
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Error submitting withdrawal:', error);
      setModalType('error');
      setModalMessage('Error: ' + error);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWithdrawStatus = async (id: string, status: 'approved' | 'rejected') => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'withdrawals', id), { status });
      setModalType('success');
      setModalMessage(`Withdrawal ${status} successfully`);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      console.error('Error updating withdrawal status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBankDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'bank_details', id));
      setModalType('success');
      setModalMessage(t.bankDeleted);
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error deleting bank:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${['dashboard', 'profile', 'bank', 'withdraw'].includes(view) ? 'bg-[#f0f2f5]' : 'bg-[#373e4a]'} flex items-center justify-center p-0 font-sans overflow-x-hidden`}>
      <AnimatePresence mode="wait">
        {['dashboard', 'profile', 'bank', 'withdraw'].includes(view) && (
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-screen flex flex-col"
          >
            {/* Top Navigation */}
            <header className="bg-[#4a5568] text-white h-14 flex items-center px-4 sticky top-0 z-40 shadow-md">
              <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/10 rounded-md transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="flex-1 flex items-center gap-2 ml-2 overflow-x-auto no-scrollbar">
                <button className="whitespace-nowrap bg-white/20 px-3 py-1.5 rounded text-[11px] font-medium flex items-center gap-1 hover:bg-white/30 transition-colors">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" /></svg>
                  {t.defaultSignupLink}
                </button>
                <button className="whitespace-nowrap bg-white/20 px-3 py-1.5 rounded text-[11px] font-medium flex items-center gap-1 hover:bg-white/30 transition-colors">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" /></svg>
                  {t.affiliateReferralLink}
                </button>
              </div>

              <div className="flex items-center gap-4 ml-2">
                <div className="text-sm font-medium flex items-center gap-2">
                  <span className="text-gray-300">৳</span> 
                  <span className="font-bold">{currentUserData?.balance?.toLocaleString() || '0.00'}</span>
                  <button 
                    onClick={refreshBalance}
                    disabled={loading}
                    className={`p-1 hover:bg-white/10 rounded-full transition-colors ${loading ? 'animate-spin' : ''}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
                <button 
                  onClick={() => setView('payment')}
                  className="bg-[#e2136e] px-3 py-1 rounded text-[11px] font-bold hover:bg-[#c2105e] transition-colors shadow-sm"
                >
                  {t.depositNow}
                </button>
                <button 
                  onClick={() => setView('profile')}
                  className={`p-2 hover:bg-white/10 rounded-md transition-colors ${view === 'profile' ? 'bg-white/10' : ''}`}
                  title={t.profile}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </button>
                <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-md transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            </header>

            {/* Sidebar Overlay */}
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setIsSidebarOpen(false)}
                  className="fixed inset-0 bg-black/50 z-50"
                />
              )}
            </AnimatePresence>

            {/* Sidebar */}
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: isSidebarOpen ? 0 : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-[#2d3748] text-gray-300 z-50 shadow-2xl flex flex-col"
            >
              <div className="h-14 flex items-center px-6 border-b border-white/10">
                <h2 className="text-lg font-bold text-white">Menu</h2>
              </div>
              <nav className="flex-1 py-4 overflow-y-auto">
                <div 
                  onClick={() => { setView('dashboard'); setIsSidebarOpen(false); }}
                  className={`px-4 py-2 flex items-center gap-3 cursor-pointer ${view === 'dashboard' ? 'bg-white/10 text-white' : 'hover:bg-white/5'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  {t.dashboard}
                </div>
                <div 
                  onClick={() => setIsAccountExpanded(!isAccountExpanded)}
                  className="px-4 py-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    {t.myAccount}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isAccountExpanded ? 'rotate-180' : ''}`} />
                </div>
                
                <AnimatePresence>
                  {isAccountExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div 
                        onClick={() => { setView('profile'); setIsSidebarOpen(false); }}
                        className={`pl-12 py-2 text-sm cursor-pointer transition-colors ${view === 'profile' ? 'text-white font-bold' : 'hover:text-white'}`}
                      >
                        {t.profile}
                      </div>
                      <div 
                        onClick={() => { setView('bank'); setIsSidebarOpen(false); }}
                        className={`pl-12 py-2 text-sm cursor-pointer transition-colors ${view === 'bank' ? 'text-white font-bold' : 'hover:text-white'}`}
                      >
                        {t.bank}
                      </div>
                      <div 
                        onClick={() => { setView('withdraw'); setIsSidebarOpen(false); }}
                        className={`pl-12 py-2 text-sm cursor-pointer transition-colors ${view === 'withdraw' ? 'text-white font-bold' : 'hover:text-white'}`}
                      >
                        {t.withdraw}
                      </div>
                      {currentUserData?.username === 'saju241' && (
                        <div 
                          onClick={() => { setView('admin'); setIsSidebarOpen(false); }}
                          className={`pl-12 py-2 text-sm cursor-pointer transition-colors ${view === 'admin' ? 'text-white font-bold' : 'hover:text-white'}`}
                        >
                          {t.adminPanel}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                <div className="px-4 py-3 flex items-center gap-3 hover:bg-white/5 cursor-pointer transition-colors mt-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  {t.material}
                </div>
                <div 
                  onClick={() => setIsReportExpanded(!isReportExpanded)}
                  className="px-4 py-3 flex items-center justify-between hover:bg-white/5 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    {t.report}
                  </div>
                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isReportExpanded ? 'rotate-180' : ''}`} />
                </div>
                <AnimatePresence>
                  {isReportExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pl-12 py-2 text-sm hover:text-white cursor-pointer transition-colors">{t.commission}</div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </nav>
            </motion.aside>

            {/* Main Content Area */}
            <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
              {view === 'dashboard' && (
                <>
                  <div className="flex justify-end">
                    <div className="relative w-24">
                      <select className="w-full appearance-none px-3 py-1.5 border border-gray-300 rounded-md bg-white text-sm font-medium outline-none cursor-pointer">
                        <option>BDT</option>
                        <option>USD</option>
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* Balance Card */}
                  <div className="bg-white rounded-lg p-6 shadow-sm border-t-4 border-blue-500">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-[#2d3748]">{t.balance}</h3>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setView('payment')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-full hover:bg-blue-700 transition-all shadow-sm active:scale-95"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          {t.depositNow}
                        </button>
                        <button 
                          onClick={refreshUserData}
                          disabled={loading}
                          className="p-2 hover:bg-gray-100 rounded-full transition-colors disabled:opacity-50"
                          title={t.refresh}
                        >
                          <svg className={`w-5 h-5 text-blue-500 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-[#2d3748]">৳{(currentUserData?.balance || 0).toLocaleString()}</span>
                      <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{currentUserData?.currency || 'BDT'}</span>
                    </div>
                  </div>

                  {/* Commission Card */}
                  <div className="bg-[#c9d6df] rounded-lg p-6 shadow-sm border-t-4 border-[#4a5568]">
                    <h3 className="text-lg font-bold text-[#2d3748] mb-4">{t.commission}</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-600 font-medium">{t.thisPeriod}</span>
                        <span className="text-2xl font-bold text-[#2d3748]">৳0.00</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-600 font-medium">{t.lastPeriod}</span>
                        <span className="text-3xl font-bold text-[#2d3748]">৳0.00</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Players Card */}
                  <div className="bg-[#d4e2d4] rounded-lg p-6 shadow-sm border-t-4 border-[#4a8a8a]">
                    <h3 className="text-lg font-bold text-[#2d3748] mb-4">{t.activePlayers}</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-600 font-medium">{t.thisPeriod}</span>
                        <span className="text-3xl font-bold text-[#2d3748]">0</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-gray-600 font-medium">{t.lastPeriod}</span>
                        <span className="text-4xl font-bold text-[#2d3748]">0</span>
                      </div>
                    </div>
                  </div>

                  {/* Registered Users Table */}
                  <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div 
                      onClick={() => setIsRegisteredUsersExpanded(!isRegisteredUsersExpanded)}
                      className="px-4 py-4 border-b flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-[#4a5568] rounded-full" />
                        <h3 className="font-bold text-[#2d3748]">{t.registeredUsers}</h3>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isRegisteredUsersExpanded ? 'rotate-180' : ''}`} />
                    </div>
                    <AnimatePresence>
                      {isRegisteredUsersExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: 'auto' }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                              <thead className="bg-gray-100 text-gray-700 font-bold">
                                <tr>
                                  <th className="px-4 py-3 border-r text-center">{t.period}</th>
                                  <th className="px-4 py-3 text-center">{t.count}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {[
                                  { label: t.today, count: 0 },
                                  { label: t.yesterday, count: 0 },
                                  { label: t.thisWeek, count: 0 },
                                  { label: t.lastWeek, count: 0 },
                                  { label: t.thisMonth, count: 0 },
                                  { label: t.lastMonth, count: 0 },
                                ].map((row, i) => (
                                  <tr key={i} className={i % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                                    <td className="px-4 py-3 border-r text-center text-gray-600">{row.label}</td>
                                    <td className="px-4 py-3 text-center font-medium">{row.count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}

              {view === 'profile' && currentUserData && (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-6 shadow-sm border-t-4 border-[#4a5568]">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="relative">
                        <div className="w-16 h-16 bg-[#4a5568] rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                          {currentUserData.firstName?.[0] || currentUserData.username[0].toUpperCase()}{currentUserData.lastName?.[0] || ''}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                          <svg className="w-4 h-4 text-[#4a5568]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-[#2d3748]">{currentUserData.firstName} {currentUserData.lastName}</h2>
                        <p className="text-sm text-gray-500">@{currentUserData.username}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 py-4 border-t border-gray-100">
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">{t.accountStatus}</p>
                        <p className={`text-sm font-black uppercase ${currentUserData.isActivated ? 'text-green-600' : 'text-red-500'}`}>
                          {currentUserData.isActivated ? t.active : 'Inactive'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">{t.currency}</p>
                        <p className="text-sm font-black text-[#2d3748]">{currentUserData.currency}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-[#2d3748] flex items-center gap-2">
                        <div className="w-1 h-4 bg-[#4a5568] rounded-full" />
                        {t.personalInfo}
                      </h3>
                      {!isEditingProfile && (
                        <button 
                          onClick={() => {
                            setEditProfileData({
                              firstName: currentUserData.firstName,
                              lastName: currentUserData.lastName,
                              email: currentUserData.email,
                              phone: currentUserData.phone,
                              dob: currentUserData.dob
                            });
                            setIsEditingProfile(true);
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          {t.editProfile}
                        </button>
                      )}
                    </div>

                    {isEditingProfile ? (
                      <form onSubmit={handleUpdateProfile} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase">{t.firstName}</label>
                            <input
                              type="text"
                              value={editProfileData.firstName || ''}
                              onChange={(e) => setEditProfileData({...editProfileData, firstName: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-blue-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-gray-400 uppercase">{t.lastName}</label>
                            <input
                              type="text"
                              value={editProfileData.lastName || ''}
                              onChange={(e) => setEditProfileData({...editProfileData, lastName: e.target.value})}
                              className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-blue-500"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase">{t.email}</label>
                          <input
                            type="email"
                            value={editProfileData.email || ''}
                            onChange={(e) => setEditProfileData({...editProfileData, email: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase">{t.phone}</label>
                          <input
                            type="text"
                            value={editProfileData.phone || ''}
                            onChange={(e) => setEditProfileData({...editProfileData, phone: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-gray-400 uppercase">{t.dob}</label>
                          <input
                            type="date"
                            value={editProfileData.dob || ''}
                            onChange={(e) => setEditProfileData({...editProfileData, dob: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-200 rounded text-sm outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex gap-2 pt-2">
                          <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2 bg-blue-600 text-white font-bold rounded text-sm hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                          >
                            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                            {t.updateProfile}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingProfile(false)}
                            className="flex-1 py-2 bg-gray-100 text-gray-600 font-bold rounded text-sm hover:bg-gray-200 transition-colors"
                          >
                            {t.cancel}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="space-y-4">
                        {[
                          { label: t.username, value: currentUserData.username },
                          { label: t.firstName, value: currentUserData.firstName },
                          { label: t.lastName, value: currentUserData.lastName },
                          { label: t.email, value: currentUserData.email },
                          { label: t.phone, value: currentUserData.phone },
                          { label: t.dob, value: currentUserData.dob },
                          { label: t.referralCode, value: currentUserData.referralCode || 'N/A' },
                          { label: t.balance, value: `৳${currentUserData.balance || 0}`, highlight: true }
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between border-b border-gray-50 pb-2">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-tighter">{item.label}</span>
                            <span className={`text-sm font-bold ${item.highlight ? 'text-blue-600' : 'text-[#2d3748]'}`}>{item.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {view === 'bank' && (
                <div className="bg-white rounded-lg p-6 shadow-sm border-t-4 border-[#4a8a8a]">
                  <h3 className="text-xl font-bold text-[#2d3748] mb-6 flex items-center gap-2">
                    <div className="w-1.5 h-6 bg-[#4a8a8a] rounded-full" />
                    {t.bankSetup}
                  </h3>
                  
                  <form onSubmit={handleBankSave} className="space-y-6">
                    <div className="space-y-1">
                      <label className="block text-sm font-bold text-gray-700">{t.selectProvider}</label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { id: 'bkash', label: t.bkash, color: 'bg-[#e2136e]', enabled: appSettings.isBkashEnabled },
                          { id: 'nagad', label: t.nagad, color: 'bg-[#f7941d]', enabled: appSettings.isNagadEnabled },
                          { id: 'rocket', label: t.rocket, color: 'bg-[#8c3494]', enabled: appSettings.isRocketEnabled },
                          { id: 'wallet', label: t.walletNumber, color: 'bg-blue-600', enabled: appSettings.isWalletNumberEnabled }
                        ].filter(p => p.enabled).map(provider => (
                          <button
                            key={provider.id}
                            type="button"
                            onClick={() => setBankData(prev => ({ ...prev, provider: provider.id }))}
                            className={`p-3 rounded-md border-2 transition-all flex flex-col items-center gap-2 ${
                              bankData.provider === provider.id ? 'border-[#4a8a8a] bg-[#f0f9f9]' : 'border-gray-100 hover:border-gray-200'
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-full ${provider.color} flex items-center justify-center text-white text-[10px] font-bold text-center leading-tight p-1`}>
                              {provider.label.split(' ')[0]}
                            </div>
                            <span className="text-[10px] font-bold text-gray-600">{provider.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-bold text-gray-700">{t.accountNumber}</label>
                      <input
                        type="text"
                        value={bankData.accountNumber}
                        onChange={(e) => setBankData(prev => ({ ...prev, accountNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a8a8a] text-sm"
                        placeholder="01XXXXXXXXX"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-bold text-gray-700">{t.accountName}</label>
                      <input
                        type="text"
                        value={bankData.accountName}
                        onChange={(e) => setBankData(prev => ({ ...prev, accountName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a8a8a] text-sm"
                        placeholder="Full Name"
                      />
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-[#4a8a8a] text-white font-bold rounded-sm hover:bg-[#3d7272] transition-colors shadow-md flex items-center justify-center gap-2"
                      >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t.saveBank}
                      </button>
                    </div>
                  </form>

                  {/* Bank History Table */}
                  <div className="mt-8 space-y-4">
                    <h3 className="font-bold text-[#2d3748] flex items-center gap-2">
                      <div className="w-1 h-4 bg-[#4a8a8a] rounded-full" />
                      {t.bankHistory}
                    </h3>
                    <div className="bg-white border rounded-sm overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-700 font-bold uppercase">
                          <tr>
                            <th className="px-3 py-2 border-b">{t.provider}</th>
                            <th className="px-3 py-2 border-b">{t.accountNumber}</th>
                            <th className="px-3 py-2 border-b">{t.date}</th>
                            <th className="px-3 py-2 border-b text-center">{t.delete}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {bankHistory.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-8 text-center text-gray-400 italic">No history found</td>
                            </tr>
                          ) : (
                            bankHistory.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                                    item.provider === 'bkash' ? 'bg-[#e2136e]' : 
                                    item.provider === 'nagad' ? 'bg-[#f7941d]' : 'bg-[#8c3494]'
                                  }`}>
                                    {t[item.provider]}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-medium text-[#2d3748]">{item.accountNumber}</td>
                                <td className="px-3 py-2 text-gray-500">
                                  {item.updatedAt?.toDate ? item.updatedAt.toDate().toLocaleDateString() : 'Pending...'}
                                </td>
                                <td className="px-3 py-2 text-center">
                                  <button
                                    onClick={() => setDeleteConfirmId(item.id)}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-sm transition-colors"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
              {view === 'withdraw' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-lg p-6 shadow-sm border-t-4 border-[#4a8a8a]">
                    <h3 className="text-xl font-bold text-[#2d3748] mb-6 flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-[#4a8a8a] rounded-full" />
                      {t.withdrawNow}
                    </h3>
                    
                    <form onSubmit={handleWithdrawSubmit} className="space-y-6">
                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700">{t.withdrawMethod}</label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {[
                            { id: 'bkash', label: t.bkash, color: 'bg-[#e2136e]', enabled: appSettings.isBkashEnabled },
                            { id: 'nagad', label: t.nagad, color: 'bg-[#f7941d]', enabled: appSettings.isNagadEnabled },
                            { id: 'rocket', label: t.rocket, color: 'bg-[#8c3494]', enabled: appSettings.isRocketEnabled },
                            { id: 'wallet', label: t.walletNumber, color: 'bg-blue-600', enabled: appSettings.isWalletNumberEnabled },
                            { id: 'bank', label: t.bankAccount, color: 'bg-blue-600', enabled: true }
                          ].filter(p => p.enabled).map(provider => (
                            <button
                              key={provider.id}
                              type="button"
                              onClick={() => setWithdrawData(prev => ({ ...prev, method: provider.id }))}
                              className={`p-3 rounded-md border-2 transition-all flex flex-col items-center gap-2 ${
                                withdrawData.method === provider.id ? 'border-[#4a8a8a] bg-[#f0f9f9]' : 'border-gray-100 hover:border-gray-200'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-full ${provider.color} flex items-center justify-center text-white text-[10px] font-bold text-center leading-tight p-1`}>
                                {provider.label.split(' ')[0]}
                              </div>
                              <span className="text-[10px] font-bold text-gray-600 text-center">{provider.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {withdrawData.method === 'bank' && (
                        <>
                          <div className="space-y-1">
                            <label className="block text-sm font-bold text-gray-700">{t.bankName}</label>
                            <input
                              type="text"
                              value={withdrawData.bankName}
                              onChange={(e) => setWithdrawData(prev => ({ ...prev, bankName: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a8a8a] text-sm"
                              placeholder="Enter Bank Name"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-bold text-gray-700">{t.branchName}</label>
                            <input
                              type="text"
                              value={withdrawData.branchName}
                              onChange={(e) => setWithdrawData(prev => ({ ...prev, branchName: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a8a8a] text-sm"
                              placeholder="Enter Branch Name"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-sm font-bold text-gray-700">{t.accountHolderName}</label>
                            <input
                              type="text"
                              value={withdrawData.accountHolderName}
                              onChange={(e) => setWithdrawData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                              className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a8a8a] text-sm"
                              placeholder="Enter Account Holder Name"
                            />
                          </div>
                        </>
                      )}

                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700">{t.accountNumber}</label>
                        <select
                          value={withdrawData.accountNumber}
                          onChange={(e) => {
                            const selected = bankHistory.find(b => b.accountNumber === e.target.value);
                            if (selected) {
                              setWithdrawData(prev => ({
                                ...prev,
                                accountNumber: selected.accountNumber,
                                method: selected.provider,
                                bankName: selected.bankName || '',
                                branchName: selected.branchName || '',
                                accountHolderName: selected.accountName || ''
                              }));
                            } else {
                              setWithdrawData(prev => ({ ...prev, accountNumber: e.target.value }));
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a8a8a] text-sm"
                        >
                          <option value="">{lang === 'bn' ? 'অ্যাকাউন্ট নির্বাচন করুন' : 'Select Account'}</option>
                          {bankHistory.map(bank => (
                            <option key={bank.id} value={bank.accountNumber}>
                              {(bank.provider || '').toUpperCase()} - {bank.accountNumber} ({bank.accountName})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-sm font-bold text-gray-700">{t.withdrawAmount}</label>
                        <input
                          type="number"
                          value={withdrawData.amount}
                          onChange={(e) => setWithdrawData(prev => ({ ...prev, amount: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a8a8a] text-sm font-bold"
                          placeholder="0.00"
                        />
                        <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-widest">Available: ৳{currentUserData?.balance || 0}</p>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-[#4a8a8a] text-white font-bold rounded-sm hover:bg-[#3d7272] transition-colors shadow-md flex items-center justify-center gap-2"
                      >
                        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {t.submit}
                      </button>
                    </form>
                  </div>

                  {/* Withdraw History */}
                  <div className="bg-white rounded-lg p-6 shadow-sm">
                    <h3 className="font-bold text-[#2d3748] mb-4 flex items-center gap-2">
                      <div className="w-1 h-4 bg-[#4a8a8a] rounded-full" />
                      {t.withdrawHistory}
                    </h3>
                    <div className="bg-white border rounded-sm overflow-hidden overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-700 font-bold uppercase">
                          <tr>
                            <th className="px-3 py-2 border-b">{t.provider}</th>
                            <th className="px-3 py-2 border-b">{t.amount}</th>
                            <th className="px-3 py-2 border-b">{t.status}</th>
                            <th className="px-3 py-2 border-b">{t.date}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {withdrawals.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-3 py-8 text-center text-gray-400 italic">No withdrawal history found</td>
                            </tr>
                          ) : (
                            withdrawals.map((item) => (
                              <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                                    item.method === 'bkash' ? 'bg-[#e2136e]' : 
                                    item.method === 'nagad' ? 'bg-[#f7941d]' : 
                                    item.method === 'rocket' ? 'bg-[#8c3494]' : 
                                    item.method === 'wallet' ? 'bg-blue-600' : 'bg-gray-600'
                                  }`}>
                                    {t[item.method]}
                                  </span>
                                </td>
                                <td className="px-3 py-2 font-black text-[#2d3748]">৳{item.amount}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                    item.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                    item.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {item.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                                  {item.timestamp?.toDate ? item.timestamp.toDate().toLocaleDateString() : 'Just now'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </main>

            {/* FAB */}
            <div className="fixed bottom-6 right-6 z-40">
              <div className="relative">
                <button 
                  onClick={() => setView('profile')}
                  className="w-14 h-14 bg-black rounded-full flex items-center justify-center shadow-xl border-2 border-white/20 hover:scale-110 transition-transform"
                >
                  <div className="w-8 h-8 rounded-full bg-[#4a8a8a] flex items-center justify-center text-white">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                </button>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                  2
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'signin' && (
          <motion.div
            key="signin"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[420px] bg-white rounded-sm shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <div className="w-[6px] h-6 bg-[#4a5568] rounded-full" />
                <h1 className="text-xl font-bold text-[#2d3748]">{t.signIn}</h1>
              </div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-5">taka baji agent official account</p>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSignIn} className="p-8 space-y-6">
              <div className="space-y-1">
                <label className={`block text-sm font-bold ${showErrors && !formData.username ? 'text-[#c53030]' : 'text-gray-700'}`}>
                  {t.username}
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-sm outline-none transition-colors ${
                    showErrors && !formData.username ? 'border-[#c53030]' : 'border-gray-300 focus:border-[#4a5568]'
                  }`}
                />
                {showErrors && !formData.username && (
                  <p className="text-[11px] text-[#c53030] font-medium">{t.required}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className={`block text-sm font-bold ${showErrors && !formData.password ? 'text-[#c53030]' : 'text-gray-700'}`}>
                  {t.password}
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-sm outline-none transition-colors ${
                    showErrors && !formData.password ? 'border-[#c53030]' : 'border-gray-300 focus:border-[#4a5568]'
                  }`}
                />
                {showErrors && !formData.password && (
                  <p className="text-[11px] text-[#c53030] font-medium">{t.required}</p>
                )}
              </div>

              <div className="relative">
                <select 
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Language)}
                  className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-sm bg-white text-sm text-gray-700 outline-none cursor-pointer"
                >
                  <option value="en">{t.languages.en}</option>
                  <option value="bn">{t.languages.bn}</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              </div>
            </form>

            {/* Footer Actions */}
            <div className="px-8 pb-8 pt-2 flex flex-col items-center gap-4">
              <button
                onClick={handleSignIn}
                disabled={loading}
                className="w-32 py-2 bg-[#4a5568] text-white font-bold rounded-sm hover:bg-[#3d4654] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.signIn}
              </button>
              
              <div className="flex items-center gap-3 text-sm">
                <button
                  onClick={() => toggleView('signup')}
                  className="px-6 py-1.5 border border-[#4a8a8a] text-[#4a8a8a] font-bold rounded-sm hover:bg-[#f0f9f9] transition-colors"
                >
                  {t.signUpBtn}
                </button>
                <span className="text-gray-400">|</span>
                <button 
                  onClick={() => toggleView('forgot')}
                  className="text-[#2d3748] font-bold hover:underline"
                >
                  {t.forgotPassword}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {view === 'signup' && (
          <motion.div
            key={`signup-step-${signupStep}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[420px] bg-white rounded-sm shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-[6px] h-6 bg-[#4a5568] rounded-full" />
              <h1 className="text-xl font-bold text-[#2d3748]">{t.signUp}</h1>
            </div>

            {/* Form Content */}
            <div className="p-8 space-y-5">
              {signupStep === 1 && (
                <>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      {t.username} <span className="text-[#c53030]">*</span>
                    </label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder={t.usernamePlaceholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a5568] placeholder:text-gray-400 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      {t.password} <span className="text-[#c53030]">*</span>
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder={t.passwordPlaceholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a5568] placeholder:text-gray-400 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      {t.confirmPassword} <span className="text-[#c53030]">*</span>
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a5568] text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      {t.currency} <span className="text-[#c53030]">*</span>
                    </label>
                    <div className="relative">
                      <select 
                        name="currency"
                        value={formData.currency}
                        onChange={handleInputChange}
                        className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-sm bg-white text-sm text-gray-700 outline-none cursor-pointer"
                      >
                        <option value=""></option>
                        <option value="BDT">BDT - Bangladeshi Taka</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                  </div>
                </>
              )}

              {signupStep === 2 && (
                <>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      {t.firstName} <span className="text-[#c53030]">*</span>
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a5568] text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      {t.lastName} <span className="text-[#c53030]">*</span>
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a5568] text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      {t.dob} <span className="text-[#c53030]">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a5568] text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              {signupStep === 3 && (
                <>
                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      {t.phone} <span className="text-[#c53030]">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="relative w-24">
                        <select className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-sm bg-white text-sm text-gray-700 outline-none cursor-pointer">
                          <option>+880</option>
                          <option>+1</option>
                          <option>+44</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                      </div>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a5568] text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      {t.email} <span className="text-[#c53030]">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a5568] text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      {t.others}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative w-24">
                        <select className="w-full appearance-none px-3 py-2 border border-gray-300 rounded-sm bg-white text-sm text-gray-700 outline-none cursor-pointer">
                          <option value=""></option>
                          <option>Skype</option>
                          <option>Telegram</option>
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500 pointer-events-none" />
                      </div>
                      <input
                        type="text"
                        name="others"
                        value={formData.others}
                        onChange={handleInputChange}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a5568] text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      {t.referralCode}
                    </label>
                    <input
                      type="text"
                      name="referralCode"
                      value={formData.referralCode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a5568] text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-sm font-bold text-gray-700">
                      {t.verificationCode} <span className="text-[#c53030]">*</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        name="verificationCode"
                        value={formData.verificationCode}
                        onChange={handleInputChange}
                        placeholder="Enter OTP"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a5568] text-sm"
                      />
                      <button 
                        type="button"
                        onClick={sendSignupOTP}
                        disabled={loading}
                        className="px-4 py-2 bg-[#4a5568] text-white text-xs font-bold rounded-sm hover:bg-[#3d4654] transition-colors disabled:opacity-50"
                      >
                        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : (lang === 'bn' ? 'OTP কোড দেখুন' : 'Show OTP')}
                      </button>
                    </div>
                    {captcha && captcha !== '2482' && (
                      <p className="text-xs font-bold text-[#e2136e] mt-1">
                        {lang === 'bn' ? `আপনার কোড: ${captcha}` : `Your code: ${captcha}`}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer Actions */}
            <div className="px-8 pb-8 pt-2 flex justify-center gap-3">
              {signupStep > 1 && (
                <button
                  onClick={() => setSignupStep(signupStep - 1)}
                  className="w-24 py-2 bg-[#4a5568] text-white font-bold rounded-sm hover:bg-[#3d4654] transition-colors shadow-sm"
                >
                  {t.previous}
                </button>
              )}
              <button
                onClick={() => {
                  if (signupStep < 3) handleNext();
                  else handleSignUp();
                }}
                disabled={loading}
                className="w-24 py-2 bg-[#4a5568] text-white font-bold rounded-sm hover:bg-[#3d4654] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {signupStep === 3 ? t.signUp : t.next}
              </button>
              <button
                onClick={() => toggleView('signin')}
                className="w-24 py-2 bg-[#cbd5e0] text-[#2d3748] font-bold rounded-sm hover:bg-[#a0aec0] transition-colors shadow-sm"
              >
                {t.cancel}
              </button>
            </div>
          </motion.div>
        )}

        {view === 'forgot' && (
          <motion.div
            key="forgot"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[420px] bg-white rounded-sm shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
              <div className="w-[6px] h-6 bg-[#4a5568] rounded-full" />
              <h1 className="text-xl font-bold text-[#2d3748]">{t.forgotPasswordTitle}</h1>
            </div>

            {/* Form Content */}
            <div className="p-8 space-y-6">
              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">
                  {t.username} <span className="text-[#c53030]">*</span>
                </label>
                <input
                  type="text"
                  value={forgotData.username}
                  onChange={(e) => setForgotData({ ...forgotData, username: e.target.value.toLowerCase() })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a5568] text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-bold text-gray-700">
                  {t.emailAddress} <span className="text-[#c53030]">*</span>
                </label>
                <input
                  type="email"
                  value={forgotData.email}
                  onChange={(e) => setForgotData({ ...forgotData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-sm outline-none focus:border-[#4a5568] text-sm"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="px-8 pb-8 pt-2 flex justify-center gap-3">
              <button
                onClick={handleForgotSubmit}
                disabled={loading}
                className="w-32 py-2 bg-[#4a5568] text-white font-bold rounded-sm hover:bg-[#3d4654] transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {t.submit}
              </button>
              <button
                onClick={() => toggleView('signin')}
                className="w-32 py-2 bg-[#cbd5e0] text-[#2d3748] font-bold rounded-sm hover:bg-[#a0aec0] transition-colors shadow-sm"
              >
                {t.cancel}
              </button>
            </div>
          </motion.div>
        )}

        {view === 'activation' && (
          <motion.div
            key="activation"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-[420px] bg-white rounded-sm shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3 bg-[#f8fafc]">
              <div className="w-[6px] h-6 bg-[#4a5568] rounded-full" />
              <h1 className="text-xl font-bold text-[#2d3748]">{t.activationTitle}</h1>
            </div>
            <div className="p-8 space-y-6 text-center">
              <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              </div>
              <p className="text-gray-600 leading-relaxed">
                {t.activationDesc}
              </p>
              <div className="bg-blue-50 p-6 rounded-sm border border-blue-100 text-center">
                <h3 className="font-bold text-blue-800 mb-3">{t.personalInfo}</h3>
                <div className="space-y-2">
                  <p className="text-sm text-blue-700"><strong>{t.username}:</strong> {currentUserData?.username}</p>
                  <p className="text-sm text-blue-700"><strong>{t.email}:</strong> {currentUserData?.email}</p>
                  <p className="text-sm text-blue-700"><strong>{t.phone}:</strong> {currentUserData?.phone}</p>
                </div>
              </div>
              <button
                onClick={() => setView('payment')}
                className="w-full py-3 bg-[#2563eb] text-white font-bold rounded-sm hover:bg-[#1d4ed8] transition-colors shadow-lg flex items-center justify-center gap-2"
              >
                {t.depositNow}
              </button>
              <button
                onClick={handleLogout}
                className="w-full py-3 bg-gray-100 text-gray-600 font-bold rounded-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t.logout}
              </button>
            </div>
          </motion.div>
        )}

        {view === 'admin' && (
          <motion.div
            key="admin"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-6xl bg-[#f8fafc] rounded-xl shadow-2xl overflow-hidden border border-gray-200"
          >
            {/* Admin Header */}
            <div className="px-8 py-6 bg-gradient-to-r from-[#1e293b] to-[#334155] flex items-center justify-between shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 rounded-lg backdrop-blur-md">
                  <Settings className="w-8 h-8 text-white animate-spin-slow" />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tight uppercase">
                    {t.adminPanel}
                  </h1>
                  <p className="text-blue-200 text-xs font-bold tracking-widest uppercase opacity-80">System Control Center</p>
                </div>
              </div>
              <button 
                onClick={() => setView('dashboard')}
                className="px-6 py-2.5 bg-white text-[#1e293b] font-bold rounded-lg hover:bg-blue-50 transition-all shadow-md active:scale-95"
              >
                {t.dashboard}
              </button>
            </div>

            <div className="p-8 space-y-10">
              {/* Admin Tabs */}
              <div className="flex border-b border-gray-200 overflow-x-auto no-scrollbar">
                {[
                  { id: 'users', label: t.userManagement, icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
                  { id: 'recharge_requests', label: 'Recharge Request List', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                  { id: 'tnxid_list', label: 'Tnxid List', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 2v-6m-8 13h11a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg> },
                  { id: 'withdrawal_requests', label: 'Withdrawal Requests', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                  { id: 'logo_settings', label: 'Logo Settings', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAdminTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 text-sm font-bold transition-all border-b-2 ${
                      adminTab === tab.id 
                        ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total Users</p>
                    <p className="text-2xl font-black text-gray-800">{allUsers.length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Active</p>
                    <p className="text-2xl font-black text-gray-800">{allUsers.filter(u => u.isActivated).length}</p>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Transactions</p>
                    <p className="text-2xl font-black text-gray-800">{sheetTransactions.length}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                <div className="xl:col-span-2 space-y-10">
                  {adminTab === 'users' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                          <div className="w-2 h-6 bg-blue-600 rounded-full" />
                          {t.userManagement}
                        </h2>
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black rounded-full uppercase tracking-widest">Real-time</span>
                      </div>
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50 text-gray-500 font-bold border-b">
                              <tr>
                                <th className="px-6 py-4 uppercase tracking-tighter">User</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">Contact</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">Status</th>
                                <th className="px-6 py-4 uppercase tracking-tighter text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {allUsers.map(user => (
                                <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                                  <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                        {user.username[0].toUpperCase()}
                                      </div>
                                      <span className="font-bold text-gray-700">{user.username}</span>
                                    </div>
                                  </td>
                                  <td className="px-6 py-4 text-gray-500 font-medium">{user.email}</td>
                                  <td className="px-6 py-4">
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${user.isActivated ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                      <div className={`w-1.5 h-1.5 rounded-full ${user.isActivated ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                      {user.isActivated ? t.active : 'Inactive'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end items-center gap-2">
                                      <button
                                        onClick={() => {
                                          setSelectedAdminUser(user);
                                          setAdminModalType('view');
                                          setIsAdminModalOpen(true);
                                        }}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="View"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedAdminUser(user);
                                          setEditUserForm({
                                            balance: user.balance || 0,
                                            isActivated: user.isActivated,
                                            isLocked: user.isLocked || false,
                                            firstName: user.firstName || '',
                                            lastName: user.lastName || '',
                                            phone: user.phone || '',
                                            email: user.email || ''
                                          });
                                          setAdminModalType('edit');
                                          setIsAdminModalOpen(true);
                                        }}
                                        className="p-1.5 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                        title="Edit"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                      </button>
                                      <button
                                        onClick={() => handleToggleUserLock(user.username, !user.isLocked)}
                                        className={`p-1.5 rounded-lg transition-colors ${user.isLocked ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:bg-gray-50'}`}
                                        title={user.isLocked ? 'Unlock' : 'Lock'}
                                      >
                                        {user.isLocked ? (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        ) : (
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                                        )}
                                      </button>
                                      <button
                                        onClick={() => handlePrintUser(user)}
                                        className="p-1.5 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                                        title="Print"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2v4h10z" /></svg>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteUser(user.username)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="Delete"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Admin User Modal */}
                  <AnimatePresence>
                    {isAdminModalOpen && (
                      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 20 }}
                          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100"
                        >
                          <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-black text-gray-800 uppercase tracking-tight">
                              {adminModalType === 'view' ? 'User Details' : 'Edit User'}
                            </h3>
                            <button 
                              onClick={() => setIsAdminModalOpen(false)}
                              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                            >
                              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>

                          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {adminModalType === 'view' ? (
                              <div className="space-y-4">
                                <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-xl">
                                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-black text-white shadow-lg">
                                    {selectedAdminUser?.username[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <h4 className="text-xl font-black text-gray-800">{selectedAdminUser?.username}</h4>
                                    <p className="text-sm text-blue-600 font-bold uppercase tracking-widest">Member since {selectedAdminUser?.createdAt?.toDate ? selectedAdminUser.createdAt.toDate().toLocaleDateString() : 'N/A'}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Name</p>
                                    <p className="font-bold text-gray-700">{selectedAdminUser?.firstName} {selectedAdminUser?.lastName}</p>
                                  </div>
                                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Balance</p>
                                    <p className="font-black text-blue-600 text-lg">৳{selectedAdminUser?.balance || 0}</p>
                                  </div>
                                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email</p>
                                    <p className="font-bold text-gray-700 truncate">{selectedAdminUser?.email}</p>
                                  </div>
                                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone</p>
                                    <p className="font-bold text-gray-700">{selectedAdminUser?.phone}</p>
                                  </div>
                                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                                    <p className={`font-bold ${selectedAdminUser?.isActivated ? 'text-green-600' : 'text-red-600'}`}>
                                      {selectedAdminUser?.isActivated ? 'Active' : 'Inactive'}
                                    </p>
                                  </div>
                                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Locked</p>
                                    <p className={`font-bold ${selectedAdminUser?.isLocked ? 'text-red-600' : 'text-green-600'}`}>
                                      {selectedAdminUser?.isLocked ? 'Yes' : 'No'}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">First Name</label>
                                    <input 
                                      type="text" 
                                      value={editUserForm.firstName || ''}
                                      onChange={(e) => setEditUserForm({...editUserForm, firstName: e.target.value})}
                                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-bold text-gray-700"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Name</label>
                                    <input 
                                      type="text" 
                                      value={editUserForm.lastName || ''}
                                      onChange={(e) => setEditUserForm({...editUserForm, lastName: e.target.value})}
                                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-bold text-gray-700"
                                    />
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                                  <input 
                                    type="email" 
                                    value={editUserForm.email || ''}
                                    onChange={(e) => setEditUserForm({...editUserForm, email: e.target.value})}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-bold text-gray-700"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</label>
                                  <input 
                                    type="text" 
                                    value={editUserForm.phone || ''}
                                    onChange={(e) => setEditUserForm({...editUserForm, phone: e.target.value})}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-bold text-gray-700"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance (৳)</label>
                                  <input 
                                    type="number" 
                                    value={editUserForm.balance || 0}
                                    onChange={(e) => setEditUserForm({...editUserForm, balance: Number(e.target.value)})}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 font-black text-blue-600"
                                  />
                                </div>
                                <div className="flex items-center gap-6 pt-2">
                                  <label className="flex items-center gap-2 cursor-pointer group">
                                    <input 
                                      type="checkbox" 
                                      checked={!!editUserForm.isActivated}
                                      onChange={(e) => setEditUserForm({...editUserForm, isActivated: e.target.checked})}
                                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900 transition-colors">Activated</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer group">
                                    <input 
                                      type="checkbox" 
                                      checked={!!editUserForm.isLocked}
                                      onChange={(e) => setEditUserForm({...editUserForm, isLocked: e.target.checked})}
                                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                                    />
                                    <span className="text-xs font-bold text-gray-600 group-hover:text-gray-900 transition-colors">Locked</span>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
                            <button 
                              onClick={() => setIsAdminModalOpen(false)}
                              className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              Close
                            </button>
                            {adminModalType === 'edit' && (
                              <button 
                                onClick={handleUpdateUserDetails}
                                disabled={loading}
                                className="px-6 py-2 bg-blue-600 text-white text-sm font-black rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:opacity-50"
                              >
                                {loading ? 'Saving...' : 'Save Changes'}
                              </button>
                            )}
                            {adminModalType === 'view' && (
                              <button 
                                onClick={() => handlePrintUser(selectedAdminUser)}
                                className="px-6 py-2 bg-gray-800 text-white text-sm font-black rounded-lg hover:bg-black transition-all shadow-md active:scale-95 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2-2v4h10z" /></svg>
                                Print
                              </button>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </AnimatePresence>

                  {adminTab === 'tnxid_list' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                          <div className="w-2 h-6 bg-purple-600 rounded-full" />
                          Tnxid List
                        </h2>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Live Sync</span>
                        </div>
                      </div>
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50 text-gray-500 font-bold border-b">
                              <tr>
                                <th className="px-6 py-4 uppercase tracking-tighter">Company</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">Transaction ID</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">Mobile Number</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">DateTime</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {sheetTransactions.map((tx, idx) => (
                                <tr key={idx} className="hover:bg-purple-50/30 transition-colors">
                                  <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-widest ${tx.mode.toLowerCase().includes('bkash') ? 'bg-pink-100 text-pink-700' : tx.mode.toLowerCase().includes('nagad') ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                                      {tx.mode}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="font-mono font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded">{tx.txId}</span>
                                  </td>
                                  <td className="px-6 py-4 text-gray-600 font-bold">{tx.phone}</td>
                                  <td className="px-6 py-4 text-gray-500 font-medium whitespace-nowrap">{tx.date}</td>
                                  <td className="px-6 py-4">
                                    <span className="font-black text-gray-800">৳{tx.amount}</span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'recharge_requests' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                          <div className="w-2 h-6 bg-green-600 rounded-full" />
                          Recharge Request List
                        </h2>
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                        </div>
                      </div>
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50 text-gray-500 font-bold border-b">
                              <tr>
                                <th className="px-6 py-4 uppercase tracking-tighter">User</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">TxID</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">Amount</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">Time</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {approvedDeposits.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="px-6 py-10 text-center text-gray-400 italic">No recharge requests yet</td>
                                </tr>
                              ) : (
                                approvedDeposits.map((dep, idx) => (
                                  <tr key={idx} className="hover:bg-green-50/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-700">{dep.username}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-green-600 font-bold">{dep.transactionId}</td>
                                    <td className="px-6 py-4 font-black text-gray-800">৳{dep.amount}</td>
                                    <td className="px-6 py-4 text-gray-500 text-xs font-medium">
                                      {dep.timestamp?.toDate ? dep.timestamp.toDate().toLocaleString() : 'Just now'}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'withdrawal_requests' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                          <div className="w-2 h-6 bg-red-600 rounded-full" />
                          Withdrawal Requests
                        </h2>
                      </div>
                      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50/50 text-gray-500 font-bold border-b">
                              <tr>
                                <th className="px-6 py-4 uppercase tracking-tighter">User</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">Method</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">Account</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">Amount</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">Status</th>
                                <th className="px-6 py-4 uppercase tracking-tighter">Date</th>
                                <th className="px-6 py-4 uppercase tracking-tighter text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {allWithdrawals.length === 0 ? (
                                <tr>
                                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400 italic">No withdrawal requests yet</td>
                                </tr>
                              ) : (
                                allWithdrawals.map((withdraw, idx) => (
                                  <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                                    <td className="px-6 py-4 font-bold text-gray-700">{withdraw.username}</td>
                                    <td className="px-6 py-4">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${
                                        withdraw.method === 'bkash' ? 'bg-[#e2136e]' : 
                                        withdraw.method === 'nagad' ? 'bg-[#f7941d]' : 
                                        withdraw.method === 'rocket' ? 'bg-[#8c3494]' : 'bg-blue-600'
                                      }`}>
                                        {withdraw.method}
                                      </span>
                                      {withdraw.method === 'bank' && (
                                        <div className="text-[10px] text-gray-400 mt-1">
                                          <div>{withdraw.bankName}</div>
                                          <div>{withdraw.branchName}</div>
                                          <div>{withdraw.accountHolderName}</div>
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-gray-600 font-bold">{withdraw.accountNumber}</td>
                                    <td className="px-6 py-4 font-black text-gray-800">৳{withdraw.amount}</td>
                                    <td className="px-6 py-4">
                                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                        withdraw.status === 'approved' ? 'bg-green-100 text-green-700' : 
                                        withdraw.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                                      }`}>
                                        {withdraw.status}
                                      </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-500 whitespace-nowrap">
                                      {withdraw.timestamp?.toDate ? withdraw.timestamp.toDate().toLocaleString() : 'Just now'}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                      {withdraw.status === 'pending' && (
                                        <div className="flex justify-end gap-2">
                                          <button 
                                            onClick={() => handleUpdateWithdrawStatus(withdraw.id, 'approved')}
                                            className="p-1.5 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                                            title="Approve"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                          </button>
                                          <button 
                                            onClick={() => handleUpdateWithdrawStatus(withdraw.id, 'rejected')}
                                            className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                                            title="Reject"
                                          >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                                          </button>
                                        </div>
                                      )}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {adminTab === 'logo_settings' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-gray-800 flex items-center gap-2">
                          <div className="w-2 h-6 bg-orange-600 rounded-full" />
                          Logo Settings
                        </h2>
                      </div>
                      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {[
                            { label: 'bKash Logo', key: 'bkashLogo' },
                            { label: 'Nagad Logo', key: 'nagadLogo' },
                            { label: 'Rocket Logo', key: 'rocketLogo' },
                            { label: 'Illustration', key: 'walletIllustration' },
                            { label: 'bKash Agent Number', key: 'bkashAgentNumber' },
                            { label: 'bKash Agent Name', key: 'bkashAgentName' },
                            { label: 'Nagad Agent Number', key: 'nagadAgentNumber' },
                            { label: 'Nagad Agent Name', key: 'nagadAgentName' },
                            { label: 'Rocket Agent Number', key: 'rocketAgentNumber' },
                            { label: 'Rocket Agent Name', key: 'rocketAgentName' }
                          ].map((item) => (
                            <div key={item.key} className="space-y-2">
                              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</label>
                              <div className="space-y-3">
                                <input 
                                  type="text" 
                                  value={(appSettings as any)[item.key] || ''}
                                  onChange={(e) => setAppSettings({...appSettings, [item.key]: e.target.value})}
                                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-50 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-700 text-xs"
                                />
                                {item.key.toLowerCase().includes('number') && (
                                  <p className="text-[9px] text-gray-400 italic">Use commas for multiple numbers (e.g. 017..., 018...)</p>
                                )}
                                {item.key.toLowerCase().includes('logo') || item.key.toLowerCase().includes('illustration') ? (
                                  <div className="h-16 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                                    {(appSettings as any)[item.key] ? (
                                      <img src={(appSettings as any)[item.key]} alt={item.label} className="h-10 object-contain" referrerPolicy="no-referrer" />
                                    ) : (
                                      <span className="text-[10px] text-gray-300 font-bold uppercase">No Preview</span>
                                    )}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                          <div className="space-y-2 mb-6">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.walletNumber}</label>
                            <input 
                              type="text" 
                              value={appSettings.walletNumber}
                              onChange={(e) => setAppSettings({...appSettings, walletNumber: e.target.value})}
                              className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-50 rounded-xl outline-none focus:border-blue-500 focus:bg-white transition-all font-bold text-gray-700"
                            />
                          </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100">
                          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Payment Method Availability</h3>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            {[
                              { label: 'Enable bKash', key: 'isBkashEnabled', color: 'text-[#e2136e]' },
                              { label: 'Enable Nagad', key: 'isNagadEnabled', color: 'text-[#f7941d]' },
                              { label: 'Enable Rocket', key: 'isRocketEnabled', color: 'text-[#8c3494]' },
                              { label: 'Enable Wallet Number', key: 'isWalletNumberEnabled', color: 'text-blue-600' }
                            ].map((method) => (
                              <label key={method.key} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer group hover:bg-white hover:shadow-md transition-all border-2 border-transparent hover:border-blue-100">
                                <span className={`text-xs font-bold ${method.color}`}>{method.label}</span>
                                <div className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={!!(appSettings as any)[method.key]}
                                    onChange={(e) => setAppSettings({...appSettings, [method.key]: e.target.checked})}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </div>
                              </label>
                            ))}
                          </div>
                          
                          <button 
                            onClick={handleSaveSettings}
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95 uppercase tracking-widest text-xs"
                          >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
                            {t.saveSettings}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
        {view === 'payment' && (
          <motion.div
            key="payment"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="w-full max-w-[450px] bg-white rounded-lg shadow-2xl overflow-hidden border border-gray-200"
          >
            {/* Payment Header with Logos */}
            <div className="bg-white px-6 py-4 flex items-center justify-between border-b">
              <div className="flex items-center gap-3">
                <img 
                  src={appSettings.bkashLogo} 
                  alt="bKash" 
                  className={`w-10 h-10 object-contain cursor-pointer p-1 rounded-lg transition-all ${selectedMethod === 'bkash' ? 'bg-pink-50 ring-2 ring-pink-500' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                  onClick={() => setSelectedMethod('bkash')}
                  referrerPolicy="no-referrer"
                />
                <img 
                  src={appSettings.nagadLogo} 
                  alt="Nagad" 
                  className={`w-10 h-10 object-contain cursor-pointer p-1 rounded-lg transition-all ${selectedMethod === 'nagad' ? 'bg-orange-50 ring-2 ring-orange-500' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                  onClick={() => setSelectedMethod('nagad')}
                  referrerPolicy="no-referrer"
                />
                <img 
                  src={appSettings.rocketLogo} 
                  alt="Rocket" 
                  className={`w-10 h-10 object-contain cursor-pointer p-1 rounded-lg transition-all ${selectedMethod === 'rocket' ? 'bg-purple-50 ring-2 ring-purple-500' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                  onClick={() => setSelectedMethod('rocket')}
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="flex items-center gap-4">
                <h1 className={`text-xl font-bold ${selectedMethod === 'bkash' ? 'text-[#e2136e]' : selectedMethod === 'nagad' ? 'text-[#f7941d]' : 'text-[#8c3494]'}`}>{t.paymentTitle}</h1>
                <button 
                  onClick={() => setView(currentUserData?.isActivated ? 'dashboard' : 'activation')}
                  className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Transaction Info */}
            <div className="px-6 py-3 bg-gray-50 border-b text-sm text-gray-600">
              <p>{t.transactionId}: <span className="font-mono font-bold text-gray-800">{paymentData.generatedTxId}</span></p>
              <p>{t.creationTime}: <span className="font-bold text-gray-800">{paymentData.createdAt}</span></p>
            </div>

            {/* Instructions */}
            <div className="p-6 space-y-6">
              <p className="text-sm text-gray-600 text-center leading-relaxed">
                {t.paymentInstructions.split(lang === 'bn' ? '০৯ : ০৯' : '09:09').map((part, i, arr) => (
                  <React.Fragment key={i}>
                    {part}
                    {i < arr.length - 1 && <span className={`font-bold ${selectedMethod === 'bkash' ? 'text-[#e2136e]' : selectedMethod === 'nagad' ? 'text-[#f7941d]' : 'text-[#8c3494]'}`}>{lang === 'bn' ? formatTime(timeLeft) : formatTimeEn(timeLeft)}</span>}
                  </React.Fragment>
                ))}
              </p>

              {/* Wallet Illustration Area */}
              <div className="bg-[#f8fafc] rounded-xl p-6 border border-gray-100 flex flex-col items-center gap-4">
                <div className="relative">
                  <img 
                    src={appSettings.walletIllustration} 
                    alt="Wallet" 
                    className="w-40 h-auto"
                    referrerPolicy="no-referrer"
                  />
                  <div className={`absolute -top-4 -right-4 w-10 h-10 rounded-full flex items-center justify-center animate-pulse ${selectedMethod === 'bkash' ? 'bg-pink-100' : selectedMethod === 'nagad' ? 'bg-orange-100' : 'bg-purple-100'}`}>
                    <span className={`font-bold text-xl ${selectedMethod === 'bkash' ? 'text-[#e2136e]' : selectedMethod === 'nagad' ? 'text-[#f7941d]' : 'text-[#8c3494]'}`}>৳</span>
                  </div>
                </div>

                {/* Account Number */}
                <div className="text-center space-y-2">
                  <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      {selectedMethod === 'bkash' ? appSettings.bkashAgentName : selectedMethod === 'nagad' ? appSettings.nagadAgentName : selectedMethod === 'rocket' ? appSettings.rocketAgentName : t.walletNumber}
                    </span>
                    <h2 className={`text-3xl font-bold tracking-wider ${selectedMethod === 'bkash' ? 'text-[#e2136e]' : selectedMethod === 'nagad' ? 'text-[#f7941d]' : selectedMethod === 'rocket' ? 'text-[#8c3494]' : 'text-blue-600'}`}>
                      {activeAgentNumber || (selectedMethod === 'bkash' ? appSettings.bkashAgentNumber.split(',')[0] : selectedMethod === 'nagad' ? appSettings.nagadAgentNumber.split(',')[0] : selectedMethod === 'rocket' ? appSettings.rocketAgentNumber.split(',')[0] : appSettings.walletNumber)}
                    </h2>
                  </div>
                  <button 
                    onClick={() => handleCopy(activeAgentNumber || (selectedMethod === 'bkash' ? appSettings.bkashAgentNumber.split(',')[0] : selectedMethod === 'nagad' ? appSettings.nagadAgentNumber.split(',')[0] : selectedMethod === 'rocket' ? appSettings.rocketAgentNumber.split(',')[0] : appSettings.walletNumber))}
                    className="px-4 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full border border-gray-200 hover:bg-gray-200 transition-colors"
                  >
                    {t.copy}
                  </button>
                </div>

                {/* Amount */}
                <div className="text-center space-y-1">
                  <p className="text-gray-500 text-sm">{t.amount}: <span className={`font-bold text-lg ${selectedMethod === 'bkash' ? 'text-[#e2136e]' : selectedMethod === 'nagad' ? 'text-[#f7941d]' : 'text-[#8c3494]'}`}>10000.00</span></p>
                  <button 
                    onClick={() => handleCopy('10000')}
                    className="px-4 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full border border-gray-200 hover:bg-gray-200 transition-colors"
                  >
                    {t.copy}
                  </button>
                </div>
              </div>

              {/* Payment Form */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">
                    {t.amount} (৳)
                  </label>
                  <input
                    type="number"
                    value={paymentData.amount}
                    onChange={(e) => setPaymentData({...paymentData, amount: Number(e.target.value)})}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-md outline-none focus:ring-2 text-sm font-bold ${selectedMethod === 'bkash' ? 'focus:ring-[#e2136e]' : selectedMethod === 'nagad' ? 'focus:ring-[#f7941d]' : 'focus:ring-[#8c3494]'}`}
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">
                    {t.senderNumber}
                  </label>
                  <div className="relative">
                    <select 
                      value={paymentData.senderNumber}
                      onChange={(e) => setPaymentData({...paymentData, senderNumber: e.target.value})}
                      className={`w-full appearance-none px-4 py-3 border border-gray-300 rounded-md bg-white text-sm outline-none focus:ring-2 ${selectedMethod === 'bkash' ? 'focus:ring-[#e2136e]' : selectedMethod === 'nagad' ? 'focus:ring-[#f7941d]' : 'focus:ring-[#8c3494]'}`}
                    >
                      <option value="">Select Number</option>
                      <option value={currentUserData?.phone}>{currentUserData?.phone}</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">
                    {t.reference}
                  </label>
                  <input
                    type="text"
                    placeholder="Enter Transaction ID"
                    value={paymentData.transactionId}
                    onChange={(e) => setPaymentData({...paymentData, transactionId: e.target.value})}
                    className={`w-full px-4 py-3 border border-gray-300 rounded-md outline-none focus:ring-2 text-sm ${selectedMethod === 'bkash' ? 'focus:ring-[#e2136e]' : selectedMethod === 'nagad' ? 'focus:ring-[#f7941d]' : 'focus:ring-[#8c3494]'}`}
                  />
                </div>

                {/* Receipt Upload */}
                <div className="space-y-1">
                  <label className="block text-sm font-bold text-gray-700">
                    {t.uploadReceipt}
                  </label>
                  <div className="flex items-center gap-3">
                    <label className="flex-1 cursor-pointer">
                      <div className={`px-4 py-3 border-2 border-dashed border-gray-300 rounded-md text-center transition-colors ${selectedMethod === 'bkash' ? 'hover:border-[#e2136e]' : selectedMethod === 'nagad' ? 'hover:border-[#f7941d]' : 'hover:border-[#8c3494]'}`}>
                        <span className="text-sm text-gray-500">{paymentData.receipt ? paymentData.receipt.name : t.selectFile}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="hidden" 
                          onChange={(e) => setPaymentData({...paymentData, receipt: e.target.files?.[0] || null})}
                        />
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  onClick={handlePaymentSubmit}
                  disabled={loading}
                  className={`w-full py-4 text-white font-bold rounded-md transition-colors shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 ${selectedMethod === 'bkash' ? 'bg-[#e2136e] hover:bg-[#c2105e]' : selectedMethod === 'nagad' ? 'bg-[#f7941d] hover:bg-[#d67e1a]' : 'bg-[#8c3494] hover:bg-[#6e2975]'}`}
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {t.submitPayment}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-8 flex flex-col items-center gap-6 max-w-[400px] w-full shadow-2xl"
            >
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-lg font-bold text-center text-gray-800">
                {t.confirmDelete}
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => {
                    handleBankDelete(deleteConfirmId);
                    setDeleteConfirmId(null);
                  }}
                  className="flex-1 py-2.5 bg-red-500 text-white font-bold rounded-sm hover:bg-red-600 transition-colors shadow-sm"
                >
                  {t.confirm}
                </button>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-2.5 bg-gray-200 text-gray-800 font-bold rounded-sm hover:bg-gray-300 transition-colors shadow-sm"
                >
                  {t.cancel}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Copy Feedback Modal */}
      <AnimatePresence>
        {isCopying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4 border border-white/50"
            >
              <div className="relative">
                <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                </div>
              </div>
              <p className="text-sm font-black text-gray-800 uppercase tracking-widest">
                {lang === 'bn' ? 'কপি করা হচ্ছে...' : 'Copying...'}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-12 flex flex-col items-center gap-8 max-w-[400px] w-full shadow-2xl"
            >
              <div className={`w-32 h-32 rounded-full border-[6px] flex items-center justify-center ${modalType === 'success' ? 'border-[#e2f2e9]' : 'border-[#fee2e2]'}`}>
                <div className={`w-24 h-24 rounded-full flex items-center justify-center ${modalType === 'success' ? 'bg-[#f0f9f4]' : 'bg-[#fef2f2]'}`}>
                  {modalType === 'success' ? (
                    <svg 
                      className="w-16 h-16 text-[#68c187]" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg 
                      className="w-16 h-16 text-[#ef4444]" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  )}
                </div>
              </div>
              <h2 className={`text-4xl font-bold text-center leading-tight ${modalType === 'success' ? 'text-[#68c187]' : 'text-[#ef4444]'}`}>
                {modalMessage}
              </h2>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
