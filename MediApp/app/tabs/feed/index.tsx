import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, TouchableOpacity, View, ScrollView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuthContext } from '@/contexts/AuthContext';
import { UserRole } from '@/types/auth';

// Bundled photos (Unsplash License, see assets/images/feed/CREDITS.md): the feed renders
// offline and on first launch without depending on remote image hosts.
const IMAGES = {
  walking: require('@/assets/images/feed/walking.jpg'),
  bloodSugar: require('@/assets/images/feed/blood-sugar.jpg'),
  bpMonitor: require('@/assets/images/feed/bp-monitor.jpg'),
  vitaminD: require('@/assets/images/feed/vitamin-d.jpg'),
  stretching: require('@/assets/images/feed/stretching.jpg'),
  heartHealth: require('@/assets/images/feed/heart-health.jpg'),
  neurology: require('@/assets/images/feed/neurology.jpg'),
  aiImaging: require('@/assets/images/feed/ai-imaging.jpg'),
  genomics: require('@/assets/images/feed/genomics.jpg'),
  hypertension: require('@/assets/images/feed/hypertension.jpg'),
  clinicalTools: require('@/assets/images/feed/clinical-tools.jpg'),
};

const FEED_CONTENT = {
  patient: {
    news: [
      {
        id: 'p1',
        type: 'news',
        title: 'A Daily Walk Does More for Your Heart Than You Think',
        description:
          'Even 30 minutes of brisk walking most days lowers blood pressure, improves cholesterol and lifts your mood. Here is how to build the habit.',
        image: IMAGES.walking,
        imageAlt: 'A group of people walking along a sunny park path',
        readTime: '3 min read',
        category: 'Wellness',
        timestamp: '2h ago',
      },
      {
        id: 'p2',
        type: 'news',
        title: 'Checking Your Blood Sugar at Home: A Practical Guide',
        description:
          'When to test, how to read the numbers, and which patterns are worth sharing with your doctor at your next visit.',
        image: IMAGES.bloodSugar,
        imageAlt: 'A person checking their blood sugar with a glucose meter',
        readTime: '5 min read',
        category: 'Diabetes Care',
        timestamp: '5h ago',
      },
      {
        id: 'p3',
        type: 'news',
        title: 'Five Everyday Habits for a Healthier Heart',
        description:
          'Less salt, more sleep, regular movement, not smoking and knowing your numbers: small changes that add up over the years.',
        image: IMAGES.heartHealth,
        imageAlt: 'A stethoscope with a red heart',
        readTime: '4 min read',
        category: 'Heart Health',
        timestamp: '1d ago',
      },
    ],
    advice: [
      {
        id: 'p4',
        type: 'advice',
        title: 'Your Heart Health Checklist',
        description:
          'Simple steps that make the biggest difference for blood pressure and long-term heart health.',
        icon: 'heart-pulse',
        category: 'Heart Health',
        tips: [
          'Take your medication at the same time every day',
          'Check your blood pressure twice a week and note the readings',
          'Aim for less than 2,000 mg of sodium a day',
        ],
      },
      {
        id: 'p5',
        type: 'advice',
        title: 'Sleep Better Tonight',
        description:
          'Adults need 7 to 9 hours. A consistent routine is the easiest place to start.',
        icon: 'sleep',
        category: 'Sleep',
        tips: [
          'Go to bed and wake up at the same time, even on weekends',
          'Keep screens out of the bedroom for the last hour',
        ],
      },
    ],
    products: [
      {
        id: 'p6',
        type: 'product',
        title: 'Upper-Arm Blood Pressure Monitor',
        description:
          'Clinically validated automatic monitor with a wide-range cuff and memory for two users.',
        image: IMAGES.bpMonitor,
        price: '$49.99',
        rating: 4.7,
        category: 'Health Devices',
      },
      {
        id: 'p7',
        type: 'product',
        title: 'Vitamin D3 1000 IU Softgels',
        description:
          'A daily supplement to support bone and immune health. Ask your doctor whether you need it.',
        image: IMAGES.vitaminD,
        price: '$11.49',
        rating: 4.6,
        category: 'Supplements',
      },
    ],
    videos: [
      {
        id: 'p8',
        type: 'video',
        title: '10-Minute Morning Stretches for Lower Back Pain',
        description:
          'A gentle routine a physiotherapist recommends for stiffness after long days at a desk.',
        thumbnail: IMAGES.stretching,
        duration: '10:24',
        category: 'Exercise',
        views: '126K views',
      },
    ],
  },
  doctor: {
    news: [
      {
        id: 'd1',
        type: 'news',
        title: "Early Alzheimer's Care: What Recent Trials Mean for Primary Care",
        description:
          'A review of the latest disease-modifying therapy data, eligibility criteria, and the role of MRI monitoring.',
        image: IMAGES.neurology,
        imageAlt: 'Two clinicians reviewing a brain MRI together',
        readTime: '6 min read',
        category: 'Neurology',
        timestamp: '1h ago',
      },
      {
        id: 'd2',
        type: 'news',
        title: 'AI-Assisted Imaging: Where It Helps and Where It Does Not',
        description:
          'Decision-support models now flag findings on X-rays and CT scans. Here is how to read their output critically.',
        image: IMAGES.aiImaging,
        imageAlt: 'A clinician pointing at an X-ray on a tablet',
        readTime: '5 min read',
        category: 'Technology',
        timestamp: '3h ago',
      },
      {
        id: 'd3',
        type: 'news',
        title: 'Home Blood Pressure Monitoring in Hypertension Management',
        description:
          'Out-of-office readings improve diagnosis and adherence. A practical protocol you can share with patients.',
        image: IMAGES.hypertension,
        imageAlt: "A clinician measuring a patient's blood pressure",
        readTime: '4 min read',
        category: 'Cardiology',
        timestamp: '6h ago',
      },
      {
        id: 'd4',
        type: 'news',
        title: 'Pharmacogenomic Testing Moves Into Routine Practice',
        description:
          'Which gene-drug pairs have the strongest evidence, and when testing can change your prescribing.',
        image: IMAGES.genomics,
        imageAlt: 'A researcher using a micropipette in a laboratory',
        readTime: '5 min read',
        category: 'Genomics',
        timestamp: '1d ago',
      },
    ],
    education: [
      {
        id: 'd5',
        type: 'education',
        title: 'CME: Interpreting Echocardiograms in Primary Care',
        description:
          'Recognise the key findings in an echo report and know when to refer. Self-paced, with case studies.',
        icon: 'school',
        category: 'Cardiology CME',
        credits: 4,
        deadline: 'Jan 31, 2027',
      },
      {
        id: 'd6',
        type: 'education',
        title: 'CME: Type 2 Diabetes, From Metformin to GLP-1',
        description:
          'An update on stepwise therapy, cardiovascular and renal benefits, and shared decision-making.',
        icon: 'school',
        category: 'Endocrinology CME',
        credits: 3,
        deadline: 'Mar 15, 2027',
      },
    ],
    tools: [
      {
        id: 'd7',
        type: 'product',
        title: 'Clinical Decision Support Workspace',
        description:
          'Evidence-based recommendations, drug interaction checks and imaging review in one place.',
        image: IMAGES.clinicalTools,
        price: 'Free trial',
        rating: 4.8,
        category: 'Clinical Tools',
      },
    ],
  },
};

const FeedTab: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const { authState } = useAuthContext();
  const isDoctor = authState.user?.role === UserRole.DOCTOR;
  const userContent = isDoctor ? FEED_CONTENT.doctor : FEED_CONTENT.patient;

  const categories = isDoctor
    ? [
        { id: 'all', label: 'All', icon: 'view-grid' },
        { id: 'news', label: 'Medical News', icon: 'newspaper' },
        { id: 'education', label: 'Education', icon: 'school' },
        { id: 'tools', label: 'Clinical Tools', icon: 'tools' },
      ]
    : [
        { id: 'all', label: 'All', icon: 'view-grid' },
        { id: 'news', label: 'Health News', icon: 'newspaper' },
        { id: 'advice', label: 'Personal Tips', icon: 'lightbulb' },
        { id: 'products', label: 'Products', icon: 'shopping' },
        { id: 'videos', label: 'Videos', icon: 'play-circle' },
      ];

  const renderNewsCard = (item: any) => {
    return (
      <TouchableOpacity
        key={item.id}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4"
      >
        <Image
          source={item.image}
          className="w-full h-48 rounded-t-2xl"
          resizeMode="cover"
          accessibilityLabel={item.imageAlt || item.title}
        />
        <View className="p-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="bg-orange-50 px-2 py-1 rounded-full">
              <Text className="text-xs font-medium text-[#F05C0C]">
                {item.category}
              </Text>
            </View>
            <Text className="text-xs text-gray-500">{item.timestamp}</Text>
          </View>
          <Text
            className="text-lg font-bold text-gray-900 mb-2"
            numberOfLines={2}
          >
            {item.title}
          </Text>
          <Text className="text-sm text-gray-600 mb-3" numberOfLines={3}>
            {item.description}
          </Text>
          <View className="flex-row items-center">
            <MaterialCommunityIcons
              name="clock-outline"
              size={14}
              color="#6B7280"
            />
            <Text className="text-xs text-gray-500 ml-1">{item.readTime}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderAdviceCard = (item: any) => (
    <TouchableOpacity
      key={item.id}
      className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl p-4 mb-4 border border-blue-100"
    >
      <View className="flex-row items-center mb-3">
        <View className="w-12 h-12 bg-blue-100 rounded-xl items-center justify-center mr-3">
          <MaterialCommunityIcons
            name={item.icon as any}
            size={24}
            color="#3B82F6"
          />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">
            {item.title}
          </Text>
          <Text className="text-xs text-blue-600 font-medium">
            {item.category}
          </Text>
        </View>
      </View>
      <Text className="text-sm text-gray-700 mb-3">{item.description}</Text>
      <View className="space-y-1">
        {item.tips?.slice(0, 2).map((tip: string, index: number) => (
          <View key={index} className="flex-row items-center">
            <View className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2" />
            <Text className="text-xs text-gray-600 flex-1">{tip}</Text>
          </View>
        ))}
      </View>
    </TouchableOpacity>
  );

  const renderProductCard = (item: any) => (
    <TouchableOpacity
      key={item.id}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4"
    >
      <View className="flex-row">
        <Image
          source={item.image}
          className="w-16 h-16 rounded-xl mr-4"
          resizeMode="cover"
        />
        <View className="flex-1">
          <View className="flex-row items-start justify-between mb-1">
            <Text
              className="text-base font-semibold text-gray-900 flex-1"
              numberOfLines={2}
            >
              {item.title}
            </Text>
            <Text className="text-lg font-bold text-[#F05C0C] ml-2">
              {item.price}
            </Text>
          </View>
          <Text className="text-sm text-gray-600 mb-2" numberOfLines={2}>
            {item.description}
          </Text>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center">
              <MaterialCommunityIcons name="star" size={14} color="#F59E0B" />
              <Text className="text-sm text-gray-600 ml-1">{item.rating}</Text>
            </View>
            <Text className="text-xs text-gray-500">{item.category}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderVideoCard = (item: any) => (
    <TouchableOpacity
      key={item.id}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4"
    >
      <View className="relative">
        <Image
          source={item.thumbnail}
          className="w-full h-48 rounded-t-2xl"
          resizeMode="cover"
        />
        <View className="absolute inset-0 items-center justify-center">
          <View className="w-16 h-16 bg-black bg-opacity-70 rounded-full items-center justify-center">
            <MaterialCommunityIcons name="play" size={32} color="white" />
          </View>
        </View>
        <View className="absolute bottom-2 right-2 bg-black bg-opacity-70 px-2 py-1 rounded">
          <Text className="text-white text-xs font-medium">
            {item.duration}
          </Text>
        </View>
      </View>
      <View className="p-4">
        <Text
          className="text-base font-bold text-gray-900 mb-2"
          numberOfLines={2}
        >
          {item.title}
        </Text>
        <Text className="text-sm text-gray-600 mb-3" numberOfLines={2}>
          {item.description}
        </Text>
        <View className="flex-row items-center justify-between">
          <Text className="text-xs text-gray-500">{item.views}</Text>
          <View className="bg-purple-50 px-2 py-1 rounded-full">
            <Text className="text-xs font-medium text-purple-600">
              {item.category}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEducationCard = (item: any) => (
    <TouchableOpacity
      key={item.id}
      className="bg-green-50 rounded-2xl p-4 mb-4 border border-green-100"
    >
      <View className="flex-row items-center mb-3">
        <View className="w-12 h-12 bg-green-100 rounded-xl items-center justify-center mr-3">
          <MaterialCommunityIcons
            name={item.icon as any}
            size={24}
            color="#10B981"
          />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">
            {item.title}
          </Text>
          <Text className="text-xs text-green-600 font-medium">
            {item.category}
          </Text>
        </View>
        <View className="bg-green-100 px-2 py-1 rounded-full">
          <Text className="text-xs font-bold text-green-700">
            {item.credits} CME
          </Text>
        </View>
      </View>
      <Text className="text-sm text-gray-700 mb-3">{item.description}</Text>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <MaterialCommunityIcons name="calendar" size={14} color="#6B7280" />
          <Text className="text-xs text-gray-600 ml-1">
            Deadline: {item.deadline}
          </Text>
        </View>
        <TouchableOpacity className="bg-green-600 px-3 py-1.5 rounded-full">
          <Text className="text-white text-xs font-medium">Start Course</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Interleave the sections (news, tip, product, ...) in a stable order.
  const allContent = useMemo(() => {
    const lists = Object.values(userContent).map(list => [...list] as any[]);
    const mixed: any[] = [];
    while (lists.some(list => list.length)) {
      lists.forEach(list => list.length && mixed.push(list.shift()));
    }
    return mixed;
  }, [userContent]);
  const getAllContent = () => allContent;

  const getFilteredContent = () => {
    if (selectedCategory === 'all') {
      return getAllContent();
    }
    return (userContent as any)[selectedCategory] || [];
  };

  const renderContent = (item: any) => {
    switch (item.type) {
      case 'news':
        return renderNewsCard(item);
      case 'advice':
        return renderAdviceCard(item);
      case 'product':
        return renderProductCard(item);
      case 'video':
        return renderVideoCard(item);
      case 'education':
        return renderEducationCard(item);
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-4 bg-white border-b border-gray-200">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-gray-900">
              {isDoctor ? 'Medical Feed' : 'Health Feed'}
            </Text>
            <Text className="text-sm text-gray-600">
              {isDoctor
                ? 'Stay updated with medical news and education'
                : 'Personalized health content for you'}
            </Text>
          </View>
          <TouchableOpacity className="p-2 bg-gray-50 rounded-full">
            <MaterialCommunityIcons
              name="bell-outline"
              size={24}
              color="#6B7280"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filters */}
      <View className="bg-white border-b border-gray-100">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 py-3"
          contentContainerStyle={{ paddingRight: 20 }}
        >
          {categories.map(category => (
            <TouchableOpacity
              key={category.id}
              onPress={() => setSelectedCategory(category.id)}
              className={`flex-row items-center px-4 py-2 rounded-full mr-3 ${
                selectedCategory === category.id
                  ? 'bg-[#F05C0C]'
                  : 'bg-gray-100'
              }`}
            >
              <MaterialCommunityIcons
                name={category.icon as any}
                size={16}
                color={selectedCategory === category.id ? 'white' : '#6B7280'}
              />
              <Text
                className={`ml-2 text-sm font-medium ${
                  selectedCategory === category.id
                    ? 'text-white'
                    : 'text-gray-700'
                }`}
              >
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content Feed */}
      <ScrollView
        className="flex-1 px-4 py-4"
        showsVerticalScrollIndicator={false}
      >
        {getFilteredContent().map(renderContent)}

        {/* Bottom spacing for tab bar */}
        <View className="h-20" />

        {getFilteredContent().length === 0 && (
          <View className="py-12 items-center">
            <MaterialCommunityIcons
              name="newspaper-variant-outline"
              size={48}
              color="#9CA3AF"
              style={{ marginBottom: 12 }}
            />
            <Text className="text-gray-500 text-base font-medium mb-2">
              No content available
            </Text>
            <Text className="text-gray-400 text-sm text-center px-8">
              Check back later for personalized{' '}
              {isDoctor ? 'medical' : 'health'} content.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default FeedTab;
