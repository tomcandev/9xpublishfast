import { randomUUID } from 'node:crypto'
import { db } from '../db/index.js'
import { assets, contents } from '../db/schema.js'

interface DummyAsset {
  name: string
  file: string
  mime: string
  size: number
  type: 'video' | 'image'
}

interface DummyPost {
  code: string
  title: string
  caption: string
  contentType: 'video' | 'carousel'
  status: 'READY' | 'CLAIMED' | 'PUBLISHED'
  assetsList: DummyAsset[]
}

const sampleVideo: DummyAsset = {
  name: 'pte_speaking_tips.mp4',
  file: 'd62b83b5-80b6-42df-bca4-c579c3063f68.mp4',
  mime: 'video/mp4',
  size: 2848208,
  type: 'video',
}

const sampleImages: DummyAsset[] = [
  {
    name: 'slide_1_cover.jpg',
    file: '31b3ae47-1036-46dc-abb1-4e34c2c69dc4.jpg',
    mime: 'image/jpeg',
    size: 51575,
    type: 'image',
  },
  {
    name: 'slide_2_strategy.jpg',
    file: '7ec299be-9185-4bb5-b27d-acccc6b63823.jpg',
    mime: 'image/jpeg',
    size: 212842,
    type: 'image',
  },
  {
    name: 'slide_3_examples.jpg',
    file: '8447ebde-b4db-4abd-bd4b-87c79f2afe09.jpg',
    mime: 'image/jpeg',
    size: 94344,
    type: 'image',
  },
  {
    name: 'slide_4_summary.jpg',
    file: '95b7198c-cd8e-4c43-8576-fb3f8620bdd6.jpg',
    mime: 'image/jpeg',
    size: 275015,
    type: 'image',
  },
]

const longCaption = `🔥 5 BƯỚC BỨT PHÁ BAND ĐIỂM SPEAKING TRONG 14 NGÀY

Rất nhiều bạn gặp tình trạng bị khựng, mất bình tĩnh hoặc ngắt quãng khi phát âm. Hãy áp dụng ngay quy trình 5 bước sau:

1️⃣ Bước 1: Khởi động thanh quản mỗi sáng 5 phút với bài tập humming và phát âm nguyên âm dài.
2️⃣ Bước 2: Shadowing theo người bản xứ với tốc độ 0.75x trước khi tăng lên tốc độ chuẩn 1.0x.
3️⃣ Bước 3: Thu âm lại giọng nói của chính mình để phát hiện các lỗi nuốt âm đuôi (-s, -ed, -t).
4️⃣ Bước 4: Áp dụng kỹ thuật Chunking - chia câu thành các cụm 3-4 từ có nghĩa thay vì đọc từng từ đơn lẻ.
5️⃣ Bước 5: Luyện tập dưới áp lực đếm ngược thời gian để não bộ làm quen với phòng thi thực tế.

📌 Lưu ngay video này để áp dụng vào lộ trình luyện tập hàng ngày của bạn nhé!

#pte #ielts #speaking #studygram #englishlearning #learnenglish #ptespeaking #pronunciation #studywithme #ieltspreparation`

const dummyPosts: DummyPost[] = [
  // Multi-image Carousel (4 slides)
  {
    code: 'PTE-CAROUSEL-009',
    title: 'Trọn bộ 4 slide chiến thuật Re-order Paragraphs chuẩn xác',
    caption: 'Không còn sợ dạng bài sắp xếp đoạn văn! Vuốt sang để xem 4 bước tìm câu mở đầu và các cặp liên kết logic (linkers, pronouns, chronological order). 📑✨ #pte #reading #reorderparagraphs',
    contentType: 'carousel',
    status: 'READY',
    assetsList: sampleImages,
  },
  // Multi-image Carousel (3 slides)
  {
    code: 'VOCAB-CAROUSEL-010',
    title: 'Top 15 cụm từ học thuật C1/C2 nâng tầm Speaking & Writing',
    caption: 'Thay thế các từ cơ bản (very good, important, bad) bằng các collocations học thuật giúp bài nói mượt mà và tự nhiên hơn. Vuốt xem chi tiết! 💡 #vocabulary #academicenglish #ielts #pte',
    contentType: 'carousel',
    status: 'READY',
    assetsList: [sampleImages[0]!, sampleImages[1]!, sampleImages[2]!],
  },
  // Carousel (2 slides)
  {
    code: 'PTE-RL-011',
    title: 'Re-tell Lecture: Cách lấy 10-12 keyword ghi trọn điểm',
    caption: 'Cách take note dạng xương cá cực nhanh giúp bạn không bỏ sót ý chính của bài giảng dài. 🎙️ #pte #retelllecture #listening',
    contentType: 'carousel',
    status: 'READY',
    assetsList: [sampleImages[0]!, sampleImages[3]!],
  },
  // Video with very long scrollable caption
  {
    code: 'PTE-LONG-012',
    title: 'Lộ trình chi tiết 14 ngày bứt phá Speaking 79+',
    caption: longCaption,
    contentType: 'video',
    status: 'READY',
    assetsList: [sampleVideo],
  },
  // Quick tip video
  {
    code: 'SHORTS-TIPS-013',
    title: '1 mẹo xử lý Micro không bắt tiếng trong phòng thi PTE',
    caption: 'Đặt micro cách khóe môi 2 đốt ngón tay và thổi nhẹ kiểm tra trước khi bấm Start nhé các bạn! 🎧 #ptetips #microphonetest #examtips',
    contentType: 'video',
    status: 'READY',
    assetsList: [sampleVideo],
  },
  // Grammar carousel
  {
    code: 'GRAMMAR-014',
    title: 'Phân biệt 3 cấu trúc đảo ngữ hay gặp nhất trong đề thi',
    caption: 'Not only... but also, Hardly... when, In no way. Xem ngay slide phân tích cấu trúc và ví dụ minh họa! 📖 #grammar #writing #ielts',
    contentType: 'carousel',
    status: 'READY',
    assetsList: sampleImages,
  },
  // Daily motivation video
  {
    code: 'REELS-MOTIV-015',
    title: 'Động lực học tập mỗi ngày: Đừng bỏ cuộc khi band chưa tăng',
    caption: 'Mỗi ngày tích lũy 1 giờ luyện tập, kết quả sẽ đến sớm hơn bạn nghĩ. Cố lên nhé! 💪✨ #motivation #studyhard #englishjourney',
    contentType: 'video',
    status: 'READY',
    assetsList: [sampleVideo],
  },
  // Answer short question video
  {
    code: 'PTE-ASQ-016',
    title: '100 câu Answer Short Question phản xạ 1 giây',
    caption: 'Phản xạ nhanh như chớp với bộ 100 câu hỏi ngắn thường gặp nhất tuần này. ⚡ #pte #asq #quickquiz',
    contentType: 'video',
    status: 'READY',
    assetsList: [sampleVideo],
  },
]

let createdCount = 0

for (const post of dummyPosts) {
  const contentId = randomUUID()
  const contentRow = {
    id: contentId,
    code: post.code,
    title: post.title,
    caption: post.caption,
    contentType: post.contentType,
    status: post.status,
    assignedUserId: null,
    claimedBy: null,
    claimedAt: null,
  }

  try {
    db.insert(contents).values(contentRow).run()

    let sort = 0
    for (const asset of post.assetsList) {
      db.insert(assets)
        .values({
          id: randomUUID(),
          contentId,
          filePath: asset.file,
          originalName: asset.name,
          mime: asset.mime,
          size: asset.size,
          sortOrder: sort++,
          type: asset.type,
        })
        .run()
    }
    createdCount++
    console.log(`✓ Created post [${post.contentType.toUpperCase()}]: ${post.code} (${post.assetsList.length} assets) - ${post.title}`)
  } catch (err: any) {
    console.log(`- Post ${post.code} already exists or error: ${err.message}`)
  }
}

console.log(`\nSuccessfully seeded ${createdCount} new diverse dummy posts!`)
process.exit(0)
