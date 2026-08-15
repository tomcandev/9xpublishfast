import { randomUUID } from 'node:crypto'
import { db } from '../db/index.js'
import { assets, contents } from '../db/schema.js'

const dummyPosts = [
  {
    code: 'PTE-RS-002',
    title: 'Bí kíp bắt nhịp Repeat Sentence đạt 90/90',
    caption: '3 mẹo ghi nhớ cụm từ cực nhanh trong phần thi Repeat Sentence PTE. Lưu lại để thực hành ngay nhé! 🚀 #pte #repeatsentence #tienganh',
    contentType: 'video' as const,
    status: 'READY' as const,
    assetName: 'sample_video.mp4',
    assetFile: 'd62b83b5-80b6-42df-bca4-c579c3063f68.mp4',
    mime: 'video/mp4',
    size: 2848208,
    type: 'video' as const,
  },
  {
    code: 'PTE-DI-003',
    title: 'Template Describe Image ăn trọn điểm Fluency',
    caption: 'Không cần nói quá nhiều từ vựng phức tạp, chỉ cần áp dụng đúng cấu trúc template này! 🔥 #pte #describeimage #ptelearner',
    contentType: 'video' as const,
    status: 'READY' as const,
    assetName: 'sample_video.mp4',
    assetFile: 'd62b83b5-80b6-42df-bca4-c579c3063f68.mp4',
    mime: 'video/mp4',
    size: 2848208,
    type: 'video' as const,
  },
  {
    code: 'PTE-WFD-004',
    title: 'Tổng hợp 50 câu Write From Dictation trúng tủ tháng này',
    caption: 'Top câu Write From Dictation xuất hiện nhiều nhất trong đề thi tuần qua. Xem ngay slide chi tiết! 📚✨ #pte #writefromdictation',
    contentType: 'carousel' as const,
    status: 'READY' as const,
    assetName: 'carousel_1.jpg',
    assetFile: '31b3ae47-1036-46dc-abb1-4e34c2c69dc4.jpg',
    mime: 'image/jpeg',
    size: 51575,
    type: 'image' as const,
  },
  {
    code: 'PTE-RA-005',
    title: 'Cách ngắt nghỉ tự nhiên khi Read Aloud',
    caption: 'Đừng đọc như robot! Đây là cách giúp phát âm của bạn mượt mà và tự nhiên hơn trong phòng thi. 🎙️ #pte #readaloud #pronunciation',
    contentType: 'video' as const,
    status: 'READY' as const,
    assetName: 'sample_video.mp4',
    assetFile: 'd62b83b5-80b6-42df-bca4-c579c3063f68.mp4',
    mime: 'video/mp4',
    size: 2848208,
    type: 'video' as const,
  },
  {
    code: 'PTE-SST-006',
    title: 'Summarize Spoken Text: Bắt Keyword chuẩn xác',
    caption: 'Chiến thuật take notes nhanh không bị trễ thông tin trong bài nghe SST. Thực hành ngay nào! 🎧📝 #pte #listening',
    contentType: 'carousel' as const,
    status: 'READY' as const,
    assetName: 'carousel_2.jpg',
    assetFile: '7ec299be-9185-4bb5-b27d-acccc6b63823.jpg',
    mime: 'image/jpeg',
    size: 212842,
    type: 'image' as const,
  },
  {
    code: 'PTE-FIB-007',
    title: 'Collocation thần thánh trong Reading Fill in the Blanks',
    caption: '5 cặp từ đi liền nhau hay gặp nhất trong đề thi Reading PTE. Thuộc lòng để không bị mất điểm oan! 💡 #pte #reading #vocabulary',
    contentType: 'carousel' as const,
    status: 'READY' as const,
    assetName: 'carousel_3.jpg',
    assetFile: '8447ebde-b4db-4abd-bd4b-87c79f2afe09.jpg',
    mime: 'image/jpeg',
    size: 94344,
    type: 'image' as const,
  },
  {
    code: 'PTE-SWT-008',
    title: 'Viết 1 câu duy nhất cho Summarize Written Text',
    caption: 'Cách nối mệnh đề chuẩn ngữ pháp mà không bị câu quá dài hoặc sai logic. ✍️ #pte #writing',
    contentType: 'video' as const,
    status: 'READY' as const,
    assetName: 'sample_video.mp4',
    assetFile: 'd62b83b5-80b6-42df-bca4-c579c3063f68.mp4',
    mime: 'video/mp4',
    size: 2848208,
    type: 'video' as const,
  },
]

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
    db.insert(assets)
      .values({
        id: randomUUID(),
        contentId,
        filePath: post.assetFile,
        originalName: post.assetName,
        mime: post.mime,
        size: post.size,
        sortOrder: 0,
        type: post.type,
      })
      .run()
    console.log(`✓ Created ready post: ${post.code} - ${post.title}`)
  } catch (err: any) {
    console.log(`- Post ${post.code} already exists or error: ${err.message}`)
  }
}

console.log('\nDummy posts created successfully!')
process.exit(0)
