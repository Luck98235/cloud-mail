<template>
  <div class="translation-bar">
    <el-button
      v-if="!translatedHtml && !translatedText"
      size="small"
      :loading="translating"
      :disabled="!sourceContent"
      @click="translateContent"
    >
      {{ $t('translateToChinese') }}
    </el-button>
    <el-button v-else size="small" @click="showTranslation = !showTranslation">
      {{ showTranslation ? $t('showOriginal') : $t('showChineseTranslation') }}
    </el-button>
    <span v-if="showTranslation" class="translation-note">{{ $t('translatedByGoogle') }}</span>
  </div>
  <ShadowHtml
    v-if="htmlContent"
    class="shadow-html"
    :html="displayedHtml"
  />
  <pre v-else class="email-text">{{ displayedText }}</pre>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import ShadowHtml from '@/components/shadow-html/index.vue'
import { emailTranslate } from '@/request/email.js'

const props = defineProps({
  emailId: { type: [String, Number], required: true },
  html: { type: String, default: '' },
  text: { type: String, default: '' },
})

const translatedHtml = ref('')
const translatedText = ref('')
const translating = ref(false)
const showTranslation = ref(false)
const htmlContent = computed(() => Boolean(props.html))
const sourceContent = computed(() => props.html || props.text || '')
const displayedHtml = computed(() => showTranslation.value && translatedHtml.value ? translatedHtml.value : props.html)
const displayedText = computed(() => showTranslation.value && translatedText.value ? translatedText.value : props.text)

watch(() => [props.emailId, props.html, props.text], () => {
  translatedHtml.value = ''
  translatedText.value = ''
  showTranslation.value = false
})

async function translateContent() {
  if (!sourceContent.value || translating.value) return
  translating.value = true
  try {
    const translated = await emailTranslate(sourceContent.value, htmlContent.value ? 'html' : 'text')
    if (htmlContent.value) translatedHtml.value = translated.translatedText
    else translatedText.value = translated.translatedText
    showTranslation.value = true
  } catch (error) {
    ElMessage.error(error?.message || 'Translation failed')
  } finally {
    translating.value = false
  }
}
</script>

<style scoped>
.translation-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  margin-bottom: 8px;
}

.translation-note {
  color: var(--secondary-text-color);
  font-size: 12px;
}

.shadow-html,
.email-text {
  display: block;
  width: 100%;
  min-height: 100%;
}

.email-text {
  font-family: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  margin: 0;
}
</style>
