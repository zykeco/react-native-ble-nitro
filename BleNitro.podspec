require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  puts "🔍 DEBUG: BleNitro.podspec is being read from: #{__FILE__}"
  
  s.name         = "BleNitro"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => min_ios_version_supported, :visionos => 1.0 }
  s.source       = { :git => "https://github.com/zykeco/react-native-ble-nitro.git", :tag => "#{s.version}" }

  s.source_files = [
    # Implementation (Swift)
    "ios/**/*.{swift}",
    # Autolinking/Registration (Objective-C++)
    "ios/**/*.{m,mm}",
    # Implementation (C++ objects)
    "cpp/**/*.{hpp,cpp}",
  ]
  # s.swift_version = "5.0"

  # Nitro dependencies
  # s.dependency "React-Core"
  # s.dependency "NitroModules", "0.26.4"
  
  # iOS frameworks
  s.frameworks = "CoreBluetooth"
  
  # Base build settings (will be merged with autolinking settings)
  # base_xcconfig = {
  #   'GCC_PREPROCESSOR_DEFINITIONS' => '$(inherited) FOLLY_NO_CONFIG FOLLY_MOBILE=1 FOLLY_USE_LIBCPP=1',
  #   'CLANG_CXX_LIBRARY' => 'libc++',
  #   'OTHER_CPLUSPLUSFLAGS' => '-DFOLLY_NO_CONFIG -DFOLLY_MOBILE=1 -DFOLLY_USE_LIBCPP=1'
  # }
  
  # Merge with existing pod_target_xcconfig from autolinking
  current_xcconfig = s.pod_target_xcconfig || {}
  s.pod_target_xcconfig = base_xcconfig.merge(current_xcconfig)
  
  s.user_target_xcconfig = {
    'OTHER_LDFLAGS' => '-lc++'
  }

  # Apply Nitro autolinking
  load 'nitrogen/generated/ios/BleNitro+autolinking.rb'
  add_nitrogen_files(spec)

  s.dependency 'React-jsi'
  s.dependency 'React-callinvoker'
  install_modules_dependencies(s)
end