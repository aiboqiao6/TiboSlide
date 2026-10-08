import Foundation
import Vision
import ImageIO

do {
    var result: [String: [[Double]]] = [:]
    for path in CommandLine.arguments.dropFirst() {
        let url = URL(fileURLWithPath: path)
        let request = VNDetectFaceLandmarksRequest()
        try VNImageRequestHandler(url: url).perform([request])
        guard let faces = request.results, faces.count == 1,
              let face = faces.first,
              let left = face.landmarks?.leftEye,
              let right = face.landmarks?.rightEye else {
            throw NSError(domain: "PortraitEyes", code: 1,
                userInfo: [NSLocalizedDescriptionKey: "Expected one face and two eyes: \(path)"])
        }
        func center(_ eye: VNFaceLandmarkRegion2D) -> [Double] {
            let points = eye.normalizedPoints
            let x = points.reduce(0.0) { $0 + Double($1.x) } / Double(points.count)
            let y = points.reduce(0.0) { $0 + Double($1.y) } / Double(points.count)
            return [Double(face.boundingBox.minX) + x * Double(face.boundingBox.width),
                1 - Double(face.boundingBox.minY) - y * Double(face.boundingBox.height)]
        }
        result[path] = [center(left), center(right)].sorted { $0[0] < $1[0] }
    }
    let data = try JSONSerialization.data(withJSONObject: result, options: [.sortedKeys])
    print(String(decoding: data, as: UTF8.self))
} catch {
    fputs("Portrait landmark detection failed: \(error.localizedDescription)\n", stderr)
    exit(1)
}
