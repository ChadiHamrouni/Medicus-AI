import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { Text, TouchableOpacity, View, ScrollView, Image } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
// Remote, topic-aligned, tested Unsplash image URLs (each includes sizing & compression params for performance)
// NOTE: If an image ever fails it will auto-fallback via failedImages state below.
const TOPIC_IMAGE_URLS = {
  // Clinical / condition topics
  alzheimers:
    'https://images.unsplash.com/photo-1584036561566-baf8f5f1b144?auto=format&fit=crop&w=800&q=70', // neuron / brain pathology
  aiDiagnostics:
    'https://images.unsplash.com/photo-1581091012184-5c1d3e7f1c54?auto=format&fit=crop&w=800&q=70', // stylized DNA / data (AI diagnostics context)
  geneEditing:
    'https://images.unsplash.com/photo-1581092334651-ddf49a1c89f2?auto=format&fit=crop&w=800&q=70', // CRISPR / pipette lab scene
  pointOfCareUltrasound:
    'https://images.unsplash.com/photo-1627662169656-a7e9d6c6714d?auto=format&fit=crop&w=800&q=70', // handheld ultrasound usage
  clinicalDecisionTool:
    'https://images.unsplash.com/photo-1606761568499-6d2451b23c66?auto=format&fit=crop&w=800&q=70', // clinician reviewing decision support
  // Patient lifestyle / wellness
  walking:
    'https://images.unsplash.com/photo-1524594081293-190a2fe0baae?auto=format&fit=crop&w=800&q=70', // brisk outdoor walk
  diabetes:
    'https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=70', // glucometer reading
  stretching:
    'https://images.unsplash.com/photo-1584467735871-bd1ceee76b95?auto=format&fit=crop&w=800&q=70', // morning stretch
  bloodPressure:
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=70', // blood pressure monitor
  vitaminD:
    'https://images.unsplash.com/photo-1608474928833-3a00d097d9a1?auto=format&fit=crop&w=800&q=70', // supplement capsules
};

// Mock data for different content types
const MOCK_CONTENT = {
  patient: {
    news: [
      {
        id: '1',
        type: 'news',
        title: 'New Study Shows Benefits of Walking 10,000 Steps Daily',
        description:
          'Recent research confirms that walking 10,000 steps per day significantly improves cardiovascular health and mental wellbeing.',
        image: TOPIC_IMAGE_URLS.walking,
        imageAlt:
          'People taking a brisk outdoor walk representing daily step activity',
        readTime: '3 min read',
        category: 'Wellness',
        timestamp: '2h ago',
      },
      {
        id: '2',
        type: 'news',
        title:
          'Managing Diabetes: New Guidelines for Better Blood Sugar Control',
        description:
          'Updated recommendations for diabetes management focusing on lifestyle changes and medication adherence.',
        image: TOPIC_IMAGE_URLS.diabetes,
        imageAlt: 'Close-up of a glucometer displaying a blood glucose reading',
        readTime: '5 min read',
        category: 'Condition Management',
        timestamp: '4h ago',
      },
    ],
    advice: [
      {
        id: '3',
        type: 'advice',
        title: 'Your Personalized Heart Health Tips',
        description:
          'Based on your profile, here are specific recommendations for maintaining optimal cardiovascular health.',
        icon: 'heart-pulse',
        category: 'Heart Health',
        tips: [
          'Take medications as prescribed',
          'Monitor blood pressure daily',
          'Reduce sodium intake',
        ],
      },
    ],
    products: [
      {
        id: '4',
        type: 'product',
        title: 'OMRON Blood Pressure Monitor',
        description:
          'Clinically validated home blood pressure monitor with smartphone connectivity.',
        image: TOPIC_IMAGE_URLS.bloodPressure,
        price: '$79.99',
        rating: 4.8,
        category: 'Health Devices',
      },
      {
        id: '5',
        type: 'product',
        title: 'Nature Made Vitamin D3',
        description:
          'High-quality vitamin D3 supplement to support bone and immune health.',
        image: TOPIC_IMAGE_URLS.vitaminD,
        price: '$12.99',
        rating: 4.6,
        category: 'Supplements',
      },
    ],
    videos: [
      {
        id: '6',
        type: 'video',
        title: '10-Minute Morning Stretches for Back Pain',
        description:
          'Gentle stretching routine designed to alleviate lower back pain and improve flexibility.',
        thumbnail: TOPIC_IMAGE_URLS.stretching,
        duration: '10:24',
        category: 'Exercise',
        views: '125K views',
      },
    ],
  },
  doctor: {
    news: [
      {
        id: '7',
        type: 'news',
        title: "FDA Approves New Alzheimer's Drug with Promising Results",
        description:
          "Latest clinical trial data shows significant cognitive improvement in early-stage Alzheimer's patients.",
        image: TOPIC_IMAGE_URLS.alzheimers,
        imageAlt:
          "Microscopic neuron imagery illustrating neurodegeneration relevant to Alzheimer's disease",
        readTime: '4 min read',
        category: 'Pharmaceuticals',
        timestamp: '1h ago',
      },
      {
        id: '8',
        type: 'news',
        title:
          'AI-Powered Diagnostic Tools Show 95% Accuracy in Cancer Detection',
        description:
          'Machine learning algorithms demonstrate superior performance in early cancer screening compared to traditional methods.',
        image:
          'https://images.unsplash.com/photo-1666887360790-3e6825a6c0f4?auto=format&fit=crop&w=800&q=70',
        imageAlt:
          'Abstract medical AI interface illustrating diagnostic algorithm accuracy',
        readTime: '6 min read',
        category: 'Technology',
        timestamp: '3h ago',
      },
      // Extra mock entries for richer screenshot section (can remove later)
      {
        id: '8a',
        type: 'news',
        title: 'Breakthrough in Gene Editing Safety Profile',
        description:
          'New off-target reduction technique increases precision and may accelerate clinical adoption.',
        image: TOPIC_IMAGE_URLS.geneEditing,
        imageAlt:
          'Researcher using pipette in genetics lab depicting gene editing work',
        readTime: '5 min read',
        category: 'Genomics',
        timestamp: '5h ago',
      },
      {
        id: '8b',
        type: 'news',
        title: 'Point-of-Care Ultrasound Usage Up 40% in Outpatient Clinics',
        description:
          'Portable imaging adoption rising for rapid differential refinement and patient reassurance.',
        image: TOPIC_IMAGE_URLS.pointOfCareUltrasound,
        imageAlt:
          'Clinician performing handheld ultrasound examination at point of care',
        readTime: '3 min read',
        category: 'Practice Trends',
        timestamp: '6h ago',
      },
    ],
    education: [
      {
        id: '9',
        type: 'education',
        title: 'CME: Advanced Cardiac Imaging Techniques',
        description:
          'Earn 4 CME credits learning about the latest cardiac imaging modalities and interpretation methods.',
        icon: 'school',
        category: 'Cardiology CME',
        credits: 4,
        deadline: 'Dec 15, 2024',
      },
    ],
    tools: [
      {
        id: '10',
        type: 'product',
        title: 'Clinical Decision Support System',
        description:
          'AI-powered clinical decision support with evidence-based treatment recommendations.',
        image: TOPIC_IMAGE_URLS.clinicalDecisionTool,
        price: 'Free Trial',
        rating: 4.9,
        category: 'Clinical Tools',
      },
    ],
  },
};

const FeedTab: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  // Track failed remote images so we can swap to a stable placeholder
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const FALLBACK_IMAGE_URL =
    'https://placehold.co/800x400/FFFFFF/0F172A?text=Medical+Feed';

  // For development: assume PATIENT role if no user is set
  const isDoctor = false;
  const userContent = isDoctor ? MOCK_CONTENT.doctor : MOCK_CONTENT.patient;

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
    const imgUri = failedImages[item.id] ? FALLBACK_IMAGE_URL : item.image;
    return (
      <TouchableOpacity
        key={item.id}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-4"
      >
        <Image
          source={{ uri: imgUri }}
          className="w-full h-48 rounded-t-2xl"
          resizeMode="cover"
          accessibilityLabel={item.imageAlt || item.title}
          onError={() => {
            if (!failedImages[item.id]) {
              setFailedImages(prev => ({ ...prev, [item.id]: true }));
            }
          }}
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
          source={{ uri: item.image }}
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
          source={{ uri: item.thumbnail }}
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

  const getAllContent = () => {
    const allItems: any[] = [];
    Object.values(userContent).forEach(category => {
      allItems.push(...category);
    });
    return allItems.sort(() => Math.random() - 0.5); // Simple shuffle for mixed content
  };

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
