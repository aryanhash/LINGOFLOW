import streamlit as st
import os
import tempfile
import yt_dlp
from dotenv import load_dotenv
import sys

# Add current directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import main module functions
import main

# Extract functions from main module
extract_audio_from_video = main.extract_audio_from_video
transcribe_audio = main.transcribe_audio
merge_audio_files = main.merge_audio_files
replace_audio_in_video = main.replace_audio_in_video
save_audio_to_file = main.save_audio_to_file
spacy_models = main.spacy_models

# Load environment variables
load_dotenv()

# Page configuration
st.set_page_config(
    page_title="Video Dubber",
    page_icon="🎬",
    layout="wide"
)

# Custom CSS for better UI
st.markdown("""
    <style>
    .main-header {
        font-size: 3rem;
        font-weight: bold;
        text-align: center;
        color: #1f77b4;
        margin-bottom: 2rem;
    }
    .sub-header {
        font-size: 1.5rem;
        text-align: center;
        color: #666;
        margin-bottom: 2rem;
    }
    .stButton>button {
        width: 100%;
        background-color: #1f77b4;
        color: white;
        font-size: 1.2rem;
        padding: 0.5rem 2rem;
        border-radius: 0.5rem;
    }
    </style>
""", unsafe_allow_html=True)

# Header
st.markdown('<h1 class="main-header">🎬 Video Dubber</h1>', unsafe_allow_html=True)
st.markdown('<p class="sub-header">Automatically dub your videos into multiple languages</p>', unsafe_allow_html=True)

# Sidebar for configuration
with st.sidebar:
    st.header("⚙️ Configuration")
    
    # Source language selection
    source_language = st.selectbox(
        "Source Language",
        options=list(spacy_models.keys()),
        index=0,
        help="The language of the original video"
    )
    
    # Target language/voice selection
    st.subheader("Target Language")
    
    # Voice options based on target language
    voice_options = {
        "English": "en-US-Neural2-J",
        "Spanish": "es-US-Neural2-B",
        "German": "de-DE-Neural2-D",
        "Italian": "it-IT-Neural2-C",
        "French": "fr-FR-Neural2-D",
        "Russian": "ru-RU-Wavenet-D",
        "Hindi": "hi-IN-Neural2-B",
        "Japanese": "ja-JP-Neural2-B",
        "Korean": "ko-KR-Neural2-A",
        "Chinese": "zh-CN-Neural2-A"
    }
    
    target_language_name = st.selectbox(
        "Select Target Language",
        options=list(voice_options.keys()),
        index=1
    )
    
    target_voice = voice_options[target_language_name]
    
    # Language code mapping for translation
    language_codes = {
        "English": "en",
        "Spanish": "es",
        "German": "de",
        "Italian": "it",
        "French": "fr",
        "Russian": "ru",
        "Hindi": "hi",
        "Japanese": "ja",
        "Korean": "ko",
        "Chinese": "zh"
    }
    
    target_language_code = language_codes[target_language_name]
    
    st.info(f"Selected Voice: **{target_voice}**")

# Main content area
st.header("📤 Upload Video or Paste YouTube Link")

# Tabs for different input methods
tab1, tab2 = st.tabs(["📁 Upload Video", "🔗 YouTube Link"])

video_file_path = None

with tab1:
    uploaded_file = st.file_uploader(
        "Choose a video file",
        type=['mp4', 'avi', 'mov', 'mkv', 'flv', 'wmv'],
        help="Upload a video file from your computer"
    )
    
    if uploaded_file is not None:
        # Save uploaded file to temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(uploaded_file.name)[1]) as tmp_file:
            tmp_file.write(uploaded_file.read())
            video_file_path = tmp_file.name
            st.success(f"✅ Video uploaded: {uploaded_file.name}")

with tab2:
    youtube_url = st.text_input(
        "Enter YouTube Video URL",
        placeholder="https://www.youtube.com/watch?v=...",
        help="Paste the full YouTube video URL here"
    )
    
    if youtube_url:
        if "youtube.com" in youtube_url or "youtu.be" in youtube_url:
            st.info("🔍 YouTube URL detected. Click 'Dub Video' to download and process.")
            # Download will happen when user clicks the button
        else:
            st.warning("⚠️ Please enter a valid YouTube URL")

# Dub Video Button
st.markdown("---")
col1, col2, col3 = st.columns([1, 2, 1])

with col2:
    dub_button = st.button("🎬 Dub Video", type="primary", use_container_width=True)

# Processing section
if dub_button:
    # Validate inputs
    if not video_file_path and not youtube_url:
        st.error("❌ Please upload a video file or provide a YouTube URL")
        st.stop()
    
    # Download YouTube video if URL provided
    if youtube_url and not video_file_path:
        with st.spinner("📥 Downloading video from YouTube..."):
            try:
                ydl_opts = {
                    'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                    'outtmpl': os.path.join(tempfile.gettempdir(), '%(title)s.%(ext)s'),
                    'quiet': True,
                    'no_warnings': True,
                }
                
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    info = ydl.extract_info(youtube_url, download=True)
                    video_file_path = ydl.prepare_filename(info)
                    # Ensure it's an mp4
                    if not video_file_path.endswith('.mp4'):
                        # Find the actual downloaded file
                        base_name = os.path.splitext(video_file_path)[0]
                        for ext in ['.mp4', '.webm', '.mkv']:
                            if os.path.exists(base_name + ext):
                                video_file_path = base_name + ext
                                break
                
                st.success(f"✅ Video downloaded: {os.path.basename(video_file_path)}")
            except Exception as e:
                st.error(f"❌ Error downloading YouTube video: {str(e)}")
                st.stop()
    
    if video_file_path and os.path.exists(video_file_path):
        # Initialize progress tracking
        progress_bar = st.progress(0)
        status_text = st.empty()
        
        try:
            # Set Google credentials from environment
            google_creds = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
            if google_creds and os.path.exists(google_creds):
                os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = google_creds
            else:
                st.error("❌ Google Cloud credentials not found. Please check your .env file.")
                st.stop()
            
            # Step 1: Extract audio
            status_text.text("Step 1/5: Extracting audio from video...")
            progress_bar.progress(10)
            audio_file = extract_audio_from_video(video_file_path)
            if audio_file is None:
                st.error("❌ Failed to extract audio from video")
                st.stop()
            
            # Step 2: Transcribe audio
            status_text.text("Step 2/5: Transcribing audio (this may take a while)...")
            progress_bar.progress(30)
            transcription = transcribe_audio(audio_file, source_language.lower())
            if transcription is None:
                st.error("❌ Failed to transcribe audio")
                st.stop()
            
            # Step 3: Translate and merge audio
            status_text.text("Step 3/5: Translating and creating dubbed audio...")
            progress_bar.progress(50)
            merged_audio, ducked_audio = merge_audio_files(
                transcription,
                source_language.lower(),
                target_language_code,
                target_voice,
                audio_file
            )
            if merged_audio is None:
                st.error("❌ Failed to create dubbed audio")
                st.stop()
            
            # Step 4: Replace audio in video
            status_text.text("Step 4/5: Replacing audio in video...")
            progress_bar.progress(80)
            # Get base name for output file
            base_name = os.path.splitext(os.path.basename(video_file_path))[0]
            output_dir = tempfile.gettempdir()
            output_video_path = os.path.join(output_dir, base_name + "_translated.mp4")
            replace_audio_in_video(video_file_path, ducked_audio)
            # The function creates the file with _translated suffix, find it
            video_dir = os.path.dirname(video_file_path)
            expected_output = os.path.join(video_dir, os.path.splitext(os.path.basename(video_file_path))[0] + "_translated.mp4")
            if os.path.exists(expected_output):
                output_video_path = expected_output
            
            # Step 5: Save audio file
            status_text.text("Step 5/5: Finalizing...")
            progress_bar.progress(90)
            # Save audio in the same directory as video
            video_dir = os.path.dirname(video_file_path)
            base_name = os.path.splitext(os.path.basename(video_file_path))[0]
            output_audio_path = os.path.join(video_dir, base_name + ".wav")
            save_audio_to_file(merged_audio, output_audio_path)
            
            progress_bar.progress(100)
            status_text.text("✅ Complete!")
            
            # Success message and download buttons
            st.success("🎉 Video dubbing completed successfully!")
            st.markdown("---")
            
            # Download section
            st.header("📥 Download Your Dubbed Video")
            
            col1, col2 = st.columns(2)
            
            with col1:
                if os.path.exists(output_video_path):
                    with open(output_video_path, "rb") as video_file:
                        st.download_button(
                            label="📹 Download Dubbed Video",
                            data=video_file,
                            file_name=os.path.basename(output_video_path),
                            mime="video/mp4",
                            use_container_width=True
                        )
            
            with col2:
                if os.path.exists(output_audio_path):
                    with open(output_audio_path, "rb") as audio_file:
                        st.download_button(
                            label="🔊 Download Audio Only",
                            data=audio_file,
                            file_name=os.path.basename(output_audio_path),
                            mime="audio/wav",
                            use_container_width=True
                        )
            
            # Cleanup temporary files
            try:
                if youtube_url and os.path.exists(video_file_path):
                    os.remove(video_file_path)
            except:
                pass
                
        except Exception as e:
            st.error(f"❌ Error during processing: {str(e)}")
            st.exception(e)

# Footer
st.markdown("---")
st.markdown("""
    <div style='text-align: center; color: #666; padding: 2rem;'>
        <p>Powered by Whisper ASR, Lingo Translation, Google Text-to-Speech, Spacy, PyDub, and MoviePy</p>
    </div>
""", unsafe_allow_html=True)

